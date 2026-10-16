// Turns Ash's YouTube dataset (.xlsx) into SQL that upserts the `videos` table.
//   node scripts/videos-to-sql.mjs <dataset.xlsx> <out-folder>
// Writes videos-import-1.sql, -2.sql, … (batches of 150) for the Supabase SQL tool.
//
// The .xlsx stays outside this public repo (it lives in F:\Passatempo_PB\data).
// Sheet 1 "All Videos (…)" has every video; the other sheets are playlists.
// Re-running is safe: new videos are added; existing ones get the latest title,
// date, length and views, playlists are merged, and notes, flags and tags that
// are already set are kept.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const [file, outDir] = process.argv.slice(2)
if (!file || !outDir) throw new Error('usage: node scripts/videos-to-sql.mjs <dataset.xlsx> <out-folder>')
const USER_ID = '8cbe648a-0d47-40f1-9a38-5cb26f37fd24' // Pedro, the only user

// ---- read the .xlsx (a zip of XML files) without extra packages ----
function unzip(buf) {
  const files = {}
  let eocd = buf.length - 22
  while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  let p = buf.readUInt32LE(eocd + 16) // central directory
  const count = buf.readUInt16LE(eocd + 10)
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    const size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const data = buf.subarray(start, start + size)
    files[name] = method === 8 ? zlib.inflateRawSync(data).toString('utf8') : data.toString('utf8')
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

function readBook(buf) {
  const z = unzip(buf)
  const ss = z['xl/sharedStrings.xml']
    ? [...z['xl/sharedStrings.xml'].matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
      )
    : []
  const names = [...z['xl/workbook.xml'].matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) => decode(m[1]))
  return names.map((name, i) => ({
    name,
    rows: [...z[`xl/worksheets/sheet${i + 1}.xml`].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) =>
      [...r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].reduce((row, c) => {
        const t = /t="(\w+)"/.exec(c[2])?.[1]
        const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? '')?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] ?? '')?.[1]
        row[c[1]] = v == null ? null : t === 's' ? ss[Number(v)] : decode(v)
        return row
      }, {}),
    ),
  }))
}

// ---- rough topic tags from the title (a first guess; the coach can correct them) ----
const TAGS = {
  foot: /\b(foot|feet|toes?|arch|plantar)\b/i,
  ankle: /\b(ankles?|achilles)\b/i,
  calf: /\b(calf|calves|soleus)\b/i,
  knee: /\b(knees?|it ?band|itb)\b/i,
  hip: /\bhips?\b/i,
  glute: /\bglutes?\b|gluteus/i,
  hamstring: /\bhamstrings?\b/i,
  core: /\b(core|abs)\b/i,
  back: /\b(back|spine|lumbar)\b/i,
  neck: /\bneck\b/i,
  shoulder: /\bshoulders?\b/i,
  mobility: /\bmobility\b/i,
  stretch: /\b(stretch\w*|flexibility|yoga)\b/i,
  strength: /\b(strength|workout|resistance band|bodyweight|dumbbell|kettlebell)\b/i,
  warmup: /\b(warm[ -]?ups?|pre[ -]?run)\b/i,
  cooldown: /\b(cool[ -]?down|post[ -]?run)\b/i,
  plyometric: /\b(plyo\w*|jumps?|hops?|bounding)\b/i,
  balance: /\b(balance|stability|proprioception)\b/i,
  live: /\blive stream\b/i,
}
const tagsFor = (title) => Object.keys(TAGS).filter((t) => TAGS[t].test(title))

const idOf = (url) => /[?&]v=([\w-]{11})/.exec(url ?? '')?.[1] ?? null
function seconds(len) {
  const parts = String(len ?? '').split(':').map(Number)
  if (parts.some((n) => !Number.isFinite(n))) return null
  const s = parts.reduce((t, n) => t * 60 + n, 0)
  return s > 0 ? s : null // 0:00 = a live stream with no length
}
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`)
const arr = (xs) => `array[${xs.map(q).join(',')}]::text[]`

const [all, ...playlists] = readBook(fs.readFileSync(file))
const inPlaylists = new Map()
for (const p of playlists)
  for (const r of p.rows.slice(1)) {
    const id = idOf(r.D)
    if (id) inPlaylists.set(id, [...(inPlaylists.get(id) ?? []), p.name])
  }

const videos = all.rows
  .slice(1)
  .map((r) => ({
    id: idOf(r.D),
    title: r.B,
    date: r.C,
    s: seconds(r.E),
    views: Number(r.F) || 0,
    playlists: inPlaylists.get(idOf(r.D)) ?? [],
    tags: tagsFor(r.B ?? ''),
  }))
  .filter((v) => v.id && v.title)

const head = `insert into public.videos (yt_id, title, published_at, duration_s, views, playlists, tags, available, synced_at, user_id) values\n`
const tail = `
on conflict (yt_id) do update set
  title = excluded.title,
  published_at = excluded.published_at,
  duration_s = coalesce(excluded.duration_s, videos.duration_s),
  views = excluded.views,
  playlists = array(select distinct p from unnest(videos.playlists || excluded.playlists) p order by p),
  tags = case when cardinality(videos.tags) > 0 then videos.tags else excluded.tags end,
  synced_at = excluded.synced_at;
`
fs.mkdirSync(outDir, { recursive: true })
const BATCH = 150
for (let i = 0; i < videos.length; i += BATCH) {
  const rows = videos.slice(i, i + BATCH).map(
    (v) =>
      `(${q(v.id)}, ${q(v.title)}, ${v.date ? q(v.date) : 'null'}, ${v.s ?? 'null'}, ${v.views}, ${arr(v.playlists)}, ${arr(v.tags)}, true, now(), '${USER_ID}')`,
  )
  fs.writeFileSync(path.join(outDir, `videos-import-${i / BATCH + 1}.sql`), head + rows.join(',\n') + tail)
}

const tagCount = Object.fromEntries(Object.keys(TAGS).map((t) => [t, videos.filter((v) => v.tags.includes(t)).length]))
console.log(`${videos.length} videos, ${new Set(videos.map((v) => v.id)).size} distinct ids, ${Math.ceil(videos.length / BATCH)} batch files`)
console.log(`in a playlist: ${videos.filter((v) => v.playlists.length).length} · no length: ${videos.filter((v) => v.s == null).length} · untagged: ${videos.filter((v) => !v.tags.length).length}`)
console.log('tags:', JSON.stringify(tagCount))
