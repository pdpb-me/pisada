import { describe, expect, it } from 'vitest'
import { CHAT_MAX_CHARS } from '@/data/rules'
import { EXERCISES as CATALOG } from '@/exercises/catalog'
import { PAIN_LEVELS, painLabel } from '@/lib/pain'
import { TINGLING_SINCE as APP_TINGLING_SINCE, tinglingLabel } from '@/lib/tingling'
import {
  appMoment,
  changeNotes,
  changesSince,
  decisionNotes,
  EXERCISES,
  linesOf,
  MAX_CHARS,
  MAX_TOOL_ROUNDS,
  MODEL,
  needsNewThread,
  painWord,
  period,
  prepareProposal,
  runTool,
  systemPrompt,
  tinglingWord,
  TINGLING_SINCE,
  TOOLS,
  userBlocks,
  visibleText,
  type Change,
  type Reader,
} from '../../supabase/functions/_shared/coach.ts'

// A pretend database: remembers what was asked, and answers with the rows it was given
function fakeDb(rows: unknown[] = [], error: { message: string } | null = null) {
  const asked: { table: string; columns: string; calls: [string, unknown[]][] }[] = []
  const reader = {
    from(table: string) {
      return {
        select(columns: string) {
          const entry = { table, columns, calls: [] as [string, unknown[]][] }
          asked.push(entry)
          const query = new Proxy(
            {},
            {
              get(_, name: string) {
                if (name === 'then') return (done: (r: unknown) => void) => done({ data: rows, error })
                return (...args: unknown[]) => {
                  entry.calls.push([name, args])
                  return query
                }
              },
            },
          )
          return query
        },
      }
    },
  } as unknown as Reader
  return { reader, asked }
}

// Answers each table with its own rows, and remembers what was asked
function tablesDb(tables: Record<string, unknown[]>) {
  const asked: { table: string; columns: string }[] = []
  const reader = {
    from(table: string) {
      return {
        select(columns: string) {
          asked.push({ table, columns })
          const query: unknown = new Proxy(
            {},
            { get: (_, name: string) => (name === 'then' ? (done: (r: unknown) => void) => done({ data: tables[table] ?? [], error: null }) : () => query) },
          )
          return query
        },
      }
    },
  } as unknown as Reader
  return { reader, asked }
}

const WEEK = { from: '2026-11-02', to: '2026-11-08' }

describe('what the coach can read', () => {
  it('never reads a whole watch answer, the user id or another schema', async () => {
    const { reader, asked } = fakeDb()
    for (const tool of TOOLS) if (tool.name !== 'propose_changes') await runTool(tool.name, WEEK, reader)
    expect(asked.map((a) => a.table).sort()).toEqual(['activities', 'plan_sessions', 'reviews', 'run_steps', 'symptoms', 'tests', 'videos', 'weights'])
    for (const a of asked) {
      expect(a.table).not.toContain('.')
      expect(a.columns).not.toContain('*')
      expect(a.columns).not.toContain('raw')
      expect(a.columns).not.toContain('user_id')
    }
  })

  it('reads only its own tables for a proposal too', async () => {
    const { reader, asked } = tablesDb({})
    await prepareProposal(
      {
        summary: 'x',
        changes: [
          { action: 'change', session_id: 's1', date: '2026-11-06' },
          { action: 'add', date: '2026-11-07', slot: 'am', kind: 'run', title: 'Run', run_step: 1, video_ids: ['v1'] },
          { action: 'note', week_start: '2026-11-09', decisions: 'x' },
        ],
      },
      reader,
      '2026-11-04',
    )
    expect([...new Set(asked.map((a) => a.table))].sort()).toEqual(['plan_sessions', 'reviews', 'run_steps', 'video_feedback', 'videos'])
    for (const a of asked) {
      expect(a.columns).not.toContain('*')
      expect(a.columns).not.toContain('user_id')
    }
  })

  it('has no tool that writes: at most it proposes', () => {
    for (const tool of TOOLS) expect(tool.name).toMatch(/^(get|search|propose)_/)
    expect(TOOLS.filter((t) => t.name.startsWith('propose_')).map((t) => t.name)).toEqual(['propose_changes'])
  })

  it('gives pain as a word, the same words as the app', () => {
    for (const { score } of PAIN_LEVELS) expect(painWord(score)).toBe(painLabel(score))
    for (let score = 0; score <= 10; score++) expect(painWord(score)).toBe(painLabel(score))
  })

  it('gives hand tingling with its own words, the same as the app, on each side of the change', () => {
    expect(TINGLING_SINCE).toBe(APP_TINGLING_SINCE)
    for (const date of ['2026-11-10', TINGLING_SINCE, '2027-01-15'])
      for (let score = 0; score <= 10; score++) expect(tinglingWord(score, date)).toBe(tinglingLabel(score, date))
    expect(tinglingWord(2, '2026-11-10')).toBe('A bit')
    expect(tinglingWord(5, TINGLING_SINCE)).toBe('Hours')
  })

  it('reads the check-ins as words: pain for the arch and neck, tingling for the hands', async () => {
    const { reader, asked } = fakeDb([
      { date: '2026-11-02', timing: 'next_morning', body_area: 'arch', side: 'R', score: 5 },
      { date: '2026-11-02', timing: 'evening', body_area: 'neck', side: 'C', score: 2, triggers: [] },
      { date: '2026-11-02', timing: 'evening', body_area: 'hands', side: null, score: 5, triggers: [] },
      { date: '2026-11-14', timing: 'evening', body_area: 'neck', side: 'C', score: 5, triggers: ['bike'] },
      { date: '2026-11-14', timing: 'evening', body_area: 'hands', side: 'R', score: 5, triggers: ['desk', 'sleep'] },
    ])
    const { content } = await runTool('get_check_ins', WEEK, reader)
    expect(JSON.parse(content)).toEqual([
      { date: '2026-11-02', side: 'R', when: 'morning', area: 'arch', pain: 'Moderate' },
      { date: '2026-11-02', side: 'C', when: 'evening', area: 'neck', pain: 'Mild', came_with: [] },
      { date: '2026-11-02', hand: null, when: 'evening', area: 'hands', tingling: 'A lot', came_with: [] },
      { date: '2026-11-14', side: 'C', when: 'evening', area: 'neck', pain: 'Moderate', came_with: ['bike'] },
      { date: '2026-11-14', hand: 'right', when: 'evening', area: 'hands', tingling: 'Hours', came_with: ['desk', 'sleep'] },
    ])
    expect(content).not.toContain('score')
    const calls = Object.fromEntries(asked[0].calls)
    expect(calls.in).toEqual(['timing', ['next_morning', 'evening']])
    expect(calls.is).toEqual(['session_log_id', null])
  })

  it('puts the log, its pain as a word and the run log on the session', async () => {
    const { reader } = fakeDb([
      { date: '2026-11-02', kind: 'tendon', title: 'Arch', session_logs: { status: 'done', comment: 'ok', symptoms: [{ score: 2, timing: 'during', body_area: 'arch' }] }, activities: null },
      { date: '2026-11-03', kind: 'run', title: 'Run A', run_step: 2, session_logs: { status: 'done', comment: null, symptoms: [] }, activities: { run_step: 2, clean: true } },
      { date: '2026-11-05', kind: 'Run', title: 'Run B', run_step: 2, session_logs: null, activities: null },
      { date: '2026-11-06', kind: 'mobility', title: 'Hips', session_logs: null, activities: null },
    ])
    const { content } = await runTool('get_plan', WEEK, reader)
    expect(JSON.parse(content)).toEqual([
      { date: '2026-11-02', kind: 'tendon', title: 'Arch', log: { status: 'done', note: 'ok', pain_during: [{ area: 'arch', pain: 'Mild' }] } },
      { date: '2026-11-03', kind: 'run', title: 'Run A', run_step: 2, log: { status: 'done', note: null, pain_during: [] }, run: { run_step: 2, clean: true } },
      { date: '2026-11-05', kind: 'Run', title: 'Run B', run_step: 2, log: null, run: null },
      { date: '2026-11-06', kind: 'mobility', title: 'Hips', log: null },
    ])
  })

  it('gives the weight only as weekly averages', async () => {
    const { reader, asked } = fakeDb([
      { date: '2026-11-10', kg: '72.0' }, // Tuesday
      { date: '2026-11-09', kg: 73 }, // Monday
      { date: '2026-11-08', kg: 72.44 }, // Sunday: the week before
      { date: '2026-11-04', kg: 72.2 },
      { date: '2026-11-02', kg: 72.2 },
    ])
    const { content } = await runTool('get_weight', {}, reader)
    expect(JSON.parse(content)).toEqual([
      { week_start: '2026-11-09', avg_kg: 72.5, entries: 2 },
      { week_start: '2026-11-02', avg_kg: 72.3, entries: 3 },
    ])
    expect(content).not.toContain('72.44')
    expect(content).not.toContain('2026-11-10')
    expect(asked[0].columns).toBe('date, kg')
  })

  it('leaves out a week that the row limit may have cut', async () => {
    // 70 days back from Sunday 2026-11-08: 10 whole weeks, as many rows as the limit
    const days = Array.from({ length: 70 }, (_, i) => ({ date: new Date(Date.parse('2026-11-08') - i * 86400000).toISOString().slice(0, 10), kg: 72 }))
    const weeks = JSON.parse((await runTool('get_weight', {}, fakeDb(days).reader)).content)
    expect(weeks).toHaveLength(8)
    expect(weeks[0]).toEqual({ week_start: '2026-11-02', avg_kg: 72, entries: 7 })
  })

  it('refuses a bad or too long period, and says why', async () => {
    expect(period(WEEK)).toEqual(WEEK)
    expect(() => period({ from: '2026-11-08', to: '2026-11-02' })).toThrow('after')
    expect(() => period({ from: '2026-01-01', to: '2026-11-02' })).toThrow('at most')
    expect(period({ from: '2026-09-14', to: '2026-11-08' })).toBeTruthy() // 56 days
    expect(() => period({ from: '2026-09-13', to: '2026-11-08' })).toThrow('at most')
    const { reader, asked } = fakeDb()
    const { content, is_error } = await runTool('get_activities', { from: 'yesterday', to: '2026-11-02' }, reader)
    expect(is_error).toBe(true)
    expect(content).toContain('YYYY-MM-DD')
    expect(asked).toHaveLength(0)
  })

  it('keeps a database error out of what the coach reads', async () => {
    const { reader } = fakeDb([], { message: 'inner secret' })
    const { content, is_error } = await runTool('get_tests', {}, reader)
    expect(is_error).toBe(true)
    expect(content).not.toContain('secret')
  })

  it('answers an unknown tool with an error', async () => {
    expect((await runTool('set_plan', {}, fakeDb().reader)).is_error).toBe(true)
    expect((await runTool('propose_changes', {}, fakeDb().reader)).is_error).toBe(true) // not a reader: the server handles it
  })

  it('searches videos with the wildcards of his text taken literally', async () => {
    const { reader, asked } = fakeDb()
    await runTool('search_videos', { tags: ['foot'], text: '100%_', min_minutes: 8, max_minutes: 15 }, reader)
    const calls = Object.fromEntries(asked[0].calls)
    expect(calls.eq).toEqual(['available', true])
    expect(calls.overlaps).toEqual(['tags', ['foot']])
    expect(calls.ilike).toEqual(['title', '%100\\%\\_%'])
    expect(calls.gte).toEqual(['duration_s', 480])
    expect(calls.lte).toEqual(['duration_s', 900])
    expect(calls.limit).toEqual([20])
  })

  it('tells how often he did each video and his last rating', async () => {
    const { reader, asked } = tablesDb({
      videos: [
        { yt_id: 'v1', title: 'Hips' },
        { yt_id: 'v2', title: 'Neck' },
      ],
      video_feedback: [
        { yt_id: 'v1', rating: 'drop', date: '2026-11-08' },
        { yt_id: 'v1', rating: 'keep', date: '2026-11-01' },
      ],
      plan_sessions: [
        { video_ids: ['v1'], session_logs: { status: 'done' } },
        { video_ids: ['v1', 'v2'], session_logs: [{ status: 'partial' }] },
        { video_ids: ['v1'], session_logs: { status: 'skipped' } },
        { video_ids: ['v2'], session_logs: null },
      ],
    })
    const found = JSON.parse((await runTool('search_videos', {}, reader)).content)
    expect(found).toEqual([
      { yt_id: 'v1', title: 'Hips', times_done: 2, last_rating: { rating: 'drop', date: '2026-11-08' } },
      { yt_id: 'v2', title: 'Neck', times_done: 1, last_rating: null },
    ])
    for (const a of asked) expect(a.columns).not.toContain('*')
  })
})

describe('proposals', () => {
  const TODAY = '2026-11-04' // a Wednesday
  const BEFORE = { date: '2026-11-05', slot: 'pm', kind: 'tendon', title: 'Arch strength', instructions: 'Slow.', exercises: [], video_ids: [], run_step: null }
  const SESSION = { id: 's1', ...BEFORE, session_logs: null }
  const RUN = { id: 'r1', date: '2026-11-06', slot: 'pm', kind: 'run', title: 'Run A', instructions: null, exercises: [], video_ids: [], run_step: 1, session_logs: null }
  const STEPS = [
    { step: 1, label: '6 × (2′ jog / 2′ walk)' },
    { step: 2, label: '5 × (3′ jog / 2′ walk)' },
  ]

  const reader = (tables: Record<string, unknown[]>) => tablesDb({ run_steps: STEPS, ...tables }).reader
  const db = reader({ plan_sessions: [SESSION], videos: [{ yt_id: 'v1', title: 'Stretch', duration_s: null }] })
  const prepare = (changes: unknown, from = db) => prepareProposal({ summary: 'Move the session', changes }, from, TODAY)

  describe('his video ratings', () => {
    const videos = [
      { yt_id: 'v1', title: 'Stretch', duration_s: null },
      { yt_id: 'v2', title: 'Neck flow', duration_s: 600 },
    ]
    const rated = (rating: string) =>
      reader({
        plan_sessions: [{ ...SESSION, kind: 'mobility', video_ids: ['v2'] }],
        videos,
        video_feedback: [
          { yt_id: 'v2', rating, date: '2026-11-03' },
          { yt_id: 'v2', rating: 'keep', date: '2026-10-20' },
        ],
      })
    const add = { action: 'add', date: TODAY, slot: 'am', kind: 'mobility', title: 'Stretching', video_ids: ['v2'] }

    it('refuses a video he asked not to see again', async () => {
      const { problems } = await prepare([add], rated('drop'))
      expect(problems).toEqual(['change 1: video v2 (Neck flow (10 min)): he asked not to see this video again'])
    })

    it('goes by the latest rating: keep after drop is fine', async () => {
      const db = reader({ videos, video_feedback: [{ yt_id: 'v2', rating: 'keep', date: '2026-11-03' }, { yt_id: 'v2', rating: 'drop', date: '2026-10-20' }] })
      const { problems, notes } = await prepare([add], db)
      expect(problems).toBeUndefined()
      expect(notes).toEqual([])
    })

    it('shows an irritated one, and tells the coach so', async () => {
      const { problems, notes, lines } = await prepare([add], rated('irritated'))
      expect(problems).toBeUndefined()
      expect(lines).toContain('Video: Neck flow (10 min)')
      expect(notes).toEqual(['change 1: video v2 (Neck flow (10 min)): his latest rating was irritated, on 2026-11-03. Choose another, or tell him why this one.'])
    })

    it('leaves alone a video already in the session: moving it is fine', async () => {
      const { problems, notes } = await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }], rated('drop'))
      expect(problems).toBeUndefined()
      expect(notes).toEqual([])
    })
  })

  it('uses the same exercises as the app', () => {
    expect(EXERCISES).toEqual(Object.fromEntries(CATALOG.map((e) => [e.slug, e.name])))
  })

  it('moves a session, keeping how it was so that Apply can compare', async () => {
    const { summary, changes, lines } = await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }])
    expect(summary).toBe('Move the session')
    expect(changes).toEqual([{ op: 'change', session_id: 's1', before: BEFORE, after: { ...BEFORE, date: '2026-11-06' } }])
    expect(lines).toEqual(['Move “Arch strength”: Thu 5 Nov evening → Fri 6 Nov evening'])
  })

  it('never carries the log or the id into how it was', async () => {
    const { changes } = await prepare([{ action: 'remove', session_id: 's1' }])
    expect(changes).toEqual([{ op: 'remove', session_id: 's1', before: BEFORE }])
    expect(JSON.stringify(changes)).not.toContain('session_logs')
  })

  it('keeps the kind as it is written when it only moves a session', async () => {
    const old = reader({ plan_sessions: [{ ...SESSION, kind: 'Tendon' }] })
    const { changes, lines } = await prepare([{ action: 'change', session_id: 's1', slot: 'am' }], old)
    expect(changes?.[0]).toMatchObject({ before: { kind: 'Tendon' }, after: { kind: 'Tendon', slot: 'am' } })
    expect(lines).toEqual(['Move “Arch strength”: Thu 5 Nov evening → Thu 5 Nov morning'])
  })

  it('adds a session, in lower case, with sensible defaults', async () => {
    const { changes, lines } = await prepare([{ action: 'add', date: TODAY, slot: 'am', kind: 'Mobility', title: 'Stretching', instructions: 'Easy.', video_ids: ['v1'] }])
    expect(changes).toEqual([{ op: 'add', after: { date: TODAY, slot: 'am', kind: 'mobility', title: 'Stretching', instructions: 'Easy.', exercises: [], video_ids: ['v1'], run_step: null } }])
    expect(lines).toEqual(['Add Wed 4 Nov morning, “Stretching”: Easy.', 'Video: Stretch'])
  })

  it('accepts a session with only words: no video or figure is needed', async () => {
    expect((await prepare([{ action: 'add', date: TODAY, slot: 'am', kind: 'pilates', title: 'Class' }])).problems).toBeUndefined()
  })

  it('accepts every exercise of the catalog', async () => {
    const { problems } = await prepare([{ action: 'change', session_id: 's1', exercises: CATALOG.map((e) => e.slug) }])
    expect(problems).toBeUndefined()
  })

  it('writes the weekly note, keeping what it does not change', async () => {
    const withNote = reader({ reviews: [{ week_start: '2026-11-09', summary: 'Good.', decisions: 'Old.' }] })
    const { changes, lines } = await prepare([{ action: 'note', week_start: '2026-11-09', decisions: 'Easy week.' }], withNote)
    expect(changes).toEqual([{ op: 'note', before: { summary: 'Good.', decisions: 'Old.' }, after: { week_start: '2026-11-09', summary: 'Good.', decisions: 'Easy week.' } }])
    expect(lines).toEqual(['Note for the week of Mon 9 Nov: Easy week.'])
  })

  it('writes a new weekly note with nothing before it', async () => {
    const { changes } = await prepare([{ action: 'note', week_start: '2026-11-09', summary: 'Good week.' }])
    expect(changes).toEqual([{ op: 'note', before: null, after: { week_start: '2026-11-09', summary: 'Good week.', decisions: null } }])
  })

  it.each([
    ['an unknown session', { action: 'change', session_id: 'nope', date: '2026-11-06' }, 'not found'],
    ['an unknown exercise', { action: 'change', session_id: 's1', exercises: ['plank'] }, 'unknown exercise plank'],
    ['a video not in his list', { action: 'change', session_id: 's1', video_ids: ['nope'] }, 'not in his list'],
    ['a slot that does not exist', { action: 'change', session_id: 's1', slot: 'noon' }, 'slot must be'],
    ['a date in the past', { action: 'change', session_id: 's1', date: '2026-11-01' }, 'date must be between'],
    ['a date too far ahead', { action: 'change', session_id: 's1', date: '2028-01-01' }, 'date must be between'],
    ['a date that is not one', { action: 'add', date: 'Friday', slot: 'am', kind: 'neck', title: 'Neck' }, 'date must be YYYY-MM-DD'],
    ['a new session with no title', { action: 'add', date: TODAY, slot: 'am', kind: 'tendon' }, 'title is missing'],
    ['a new session with no kind', { action: 'add', date: TODAY, slot: 'am', title: 'Something' }, 'kind is missing'],
    ['a change of nothing', { action: 'change', session_id: 's1' }, 'changes nothing'],
    ['a change to what it already is', { action: 'change', session_id: 's1', date: '2026-11-05', title: 'Arch strength' }, 'changes nothing'],
    ['a note on a day that is not Monday', { action: 'note', week_start: '2026-11-10', decisions: 'x' }, 'must be a Monday'],
    ['a note for a past week', { action: 'note', week_start: '2026-10-26', decisions: 'x' }, 'in the past'],
    ['an empty note', { action: 'note', week_start: '2026-11-09' }, 'summary or decisions'],
    ['an unknown action', { action: 'delete_all' }, 'unknown action'],
    ['a step on a session that is not a run', { action: 'change', session_id: 's1', run_step: 1 }, 'run_step is only for kind run'],
    ['a new run with no step', { action: 'add', date: TODAY, slot: 'pm', kind: 'run', title: 'Run' }, 'a run needs a run_step from get_run_ladder'],
    ['a session that becomes a run with no step', { action: 'change', session_id: 's1', kind: 'Run' }, 'a run needs a run_step from get_run_ladder'],
    ['a step that is not on the ladder', { action: 'add', date: TODAY, slot: 'pm', kind: 'run', title: 'Run', run_step: 9 }, 'step 9 is not on the ladder'],
    ['a step that is not a whole number', { action: 'add', date: TODAY, slot: 'pm', kind: 'run', title: 'Run', run_step: '2' }, 'run_step must be a whole number'],
  ])('refuses %s, and says why', async (_, change, problem) => {
    const { problems, changes } = await prepare([change])
    expect(problems?.join()).toContain(problem)
    expect(changes).toBeUndefined()
  })

  it('accepts a note for this week', async () => {
    expect((await prepare([{ action: 'note', week_start: '2026-11-02', decisions: 'x' }])).problems).toBeUndefined()
  })

  it('does not touch the past or what he logged', async () => {
    const past = reader({ plan_sessions: [{ ...SESSION, date: '2026-11-01' }] })
    expect((await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }], past)).problems?.join()).toContain('in the past')
    const logged = reader({ plan_sessions: [{ ...SESSION, session_logs: { id: 'l' } }] })
    expect((await prepare([{ action: 'remove', session_id: 's1' }], logged)).problems?.join()).toContain('has a log')
    expect((await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }], logged)).problems).toBeUndefined()
  })

  it('refuses the same session twice, too many changes, an empty proposal', async () => {
    const twice = { action: 'change', session_id: 's1', date: '2026-11-06' }
    expect((await prepare([twice, twice])).problems?.join()).toContain('twice')
    expect((await prepare(Array.from({ length: 31 }, () => twice))).problems?.join()).toContain('at most')
    expect((await prepare(Array.from({ length: 30 }, () => ({ action: 'note', week_start: '2026-11-09', decisions: 'x' })))).problems).toBeUndefined()
    expect((await prepare([])).problems?.join()).toContain('empty')
    expect((await prepareProposal({ changes: [twice] }, db, TODAY)).problems?.join()).toContain('summary')
  })

  it('says the plan could not be read, and nothing else, when the database fails', async () => {
    const { reader: broken } = fakeDb([], { message: 'inner secret' })
    expect(await prepare([{ action: 'change', session_id: 's1', date: '2026-11-06' }], broken)).toEqual({ problems: ['The plan could not be read just now.'] })
  })

  describe('runs', () => {
    const runs = (...more: unknown[]) => reader({ plan_sessions: [SESSION, RUN, ...more] })
    const add = (date: string, extra = {}) => ({ action: 'add', date, slot: 'pm', kind: 'run', title: 'Run B', run_step: 1, ...extra })

    it('adds a run with a step of the ladder, and names the step on the card', async () => {
      const { changes, lines } = await prepare([add('2026-11-08', { run_step: 2 })], runs())
      expect(changes).toEqual([{ op: 'add', after: { date: '2026-11-08', slot: 'pm', kind: 'run', title: 'Run B', instructions: null, exercises: [], video_ids: [], run_step: 2 } }])
      expect(lines).toEqual(['Add Sun 8 Nov evening, “Run B”', 'Run step 2: 5 × (3′ jog / 2′ walk)'])
    })

    it('changes the step of a run', async () => {
      const { changes, lines } = await prepare([{ action: 'change', session_id: 'r1', run_step: 2 }], runs())
      expect(changes?.[0]).toMatchObject({ before: { run_step: 1 }, after: { run_step: 2, date: '2026-11-06' } })
      expect(lines).toEqual(['Change “Run A”', 'Run step 2: 5 × (3′ jog / 2′ walk)'])
    })

    it('takes the step away when a run becomes something else', async () => {
      const { changes, lines } = await prepare([{ action: 'change', session_id: 'r1', kind: 'hike', title: 'Easy hike' }], runs())
      expect(changes?.[0]).toMatchObject({ before: { kind: 'run', run_step: 1 }, after: { kind: 'hike', run_step: null } })
      expect(lines).toEqual(['Change “Run A” to “Easy hike”', 'Run step: not set'])
    })

    it('turns a session into a run when it gets a step', async () => {
      const { changes } = await prepare([{ action: 'change', session_id: 's1', kind: 'run', run_step: 1, date: '2026-11-08' }], runs())
      expect(changes?.[0]).toMatchObject({ after: { kind: 'run', run_step: 1 } })
    })

    it('lets a run with no step yet move: the step is a separate decision', async () => {
      const unset = reader({ plan_sessions: [{ ...RUN, run_step: null }] })
      expect((await prepare([{ action: 'change', session_id: 'r1', date: '2026-11-09' }], unset)).problems).toBeUndefined()
    })

    it.each([
      ['the same day', add('2026-11-06', { slot: 'am' }), 'the same day'],
      ['the day before', add('2026-11-05'), '2026-11-06'],
      ['the day after', add('2026-11-07'), '2026-11-06'],
    ])('refuses a new run on %s as another run', async (_, change, where) => {
      const { problems, changes } = await prepare([change], runs())
      expect(problems?.join()).toContain('at least 48 h apart')
      expect(problems?.join()).toContain(`there is a run on ${where}`)
      expect(changes).toBeUndefined()
    })

    it('accepts a run two days from another', async () => {
      expect((await prepare([add('2026-11-08')], runs())).problems).toBeUndefined()
      expect((await prepare([add('2026-11-04')], runs())).problems).toBeUndefined()
    })

    it('refuses moving a run next to another, or making a session next to one a run', async () => {
      const other = { ...RUN, id: 'r2', date: '2026-11-09', title: 'Run B' }
      expect((await prepare([{ action: 'change', session_id: 'r2', date: '2026-11-07' }], runs(other))).problems?.join()).toContain('48 h apart')
      expect((await prepare([{ action: 'change', session_id: 's1', kind: 'run', run_step: 1 }], runs())).problems?.join()).toContain('48 h apart')
    })

    it('looks at the plan as it will be: a run that moves away, or is removed, makes room', async () => {
      const away = [{ action: 'change', session_id: 'r1', date: '2026-11-09' }, add('2026-11-06')]
      expect((await prepare(away, runs())).problems).toBeUndefined()
      const removed = [{ action: 'remove', session_id: 'r1' }, add('2026-11-07')]
      expect((await prepare(removed, runs())).problems).toBeUndefined()
      const noLonger = [{ action: 'change', session_id: 'r1', kind: 'hike' }, add('2026-11-07')]
      expect((await prepare(noLonger, runs())).problems).toBeUndefined()
    })

    it('refuses two new runs too close to each other, and says it once', async () => {
      const { problems } = await prepare([add('2026-11-10'), add('2026-11-11')], runs())
      expect(problems).toHaveLength(1)
      expect(problems?.[0]).toContain('change 1')
      expect((await prepare([add('2026-11-10'), add('2026-11-10', { slot: 'am' })], runs())).problems?.join()).toContain('the same day')
      expect((await prepare([add('2026-11-10'), add('2026-11-12')], runs())).problems).toBeUndefined()
    })

    it('counts a run whose step changes in the same proposal', async () => {
      const both = [{ action: 'change', session_id: 'r1', run_step: 2 }, add('2026-11-07')]
      expect((await prepare(both, runs())).problems?.join()).toContain('48 h apart')
    })

    it('does not count a run he skipped, or one written with a capital', async () => {
      const skipped = { ...RUN, id: 'r0', date: '2026-11-03', session_logs: { status: 'skipped' } }
      expect((await prepare([add('2026-11-04')], runs(skipped))).problems).toBeUndefined()
      const done = { ...RUN, id: 'r0', date: '2026-11-03', kind: 'Run', session_logs: { status: 'done' } }
      expect((await prepare([add('2026-11-04')], runs(done))).problems?.join()).toContain('48 h apart')
    })

    it('leaves runs that were already close alone when it changes something else', async () => {
      const close = { ...RUN, id: 'r2', date: '2026-11-07', title: 'Run B' }
      expect((await prepare([{ action: 'change', session_id: 'r1', title: 'Easy run' }], runs(close))).problems).toBeUndefined()
      expect((await prepare([{ action: 'change', session_id: 's1', date: '2026-11-07' }], runs(close))).problems).toBeUndefined()
    })
  })

  it('writes one line for each thing that changes', () => {
    const change: Change = { op: 'change', session_id: 's1', before: BEFORE, after: { ...BEFORE, date: '2026-11-06', title: 'New', instructions: 'Yes.', exercises: ['banded_inversion'] } }
    expect(linesOf(change)).toEqual(['Move “Arch strength”: Thu 5 Nov evening → Fri 6 Nov evening', 'Change “Arch strength” to “New”: Yes.', `Exercise: ${EXERCISES.banded_inversion}`])
    expect(linesOf({ op: 'remove', session_id: 's1', before: BEFORE })).toEqual(['Remove “Arch strength”, Thu 5 Nov evening'])
  })

  it('says on the card which video and figures he is accepting', async () => {
    const library = reader({ videos: [{ yt_id: 'v1', title: 'Hip Stretch', duration_s: 610 }] })
    const { lines } = await prepare([{ action: 'add', date: TODAY, slot: 'am', kind: 'tendon', title: 'Session', video_ids: ['v1'], exercises: ['banded_inversion'] }], library)
    expect(lines).toEqual(['Add Wed 4 Nov morning, “Session”', 'Video: Hip Stretch (10 min)', `Exercise: ${EXERCISES.banded_inversion}`])
  })

  it('names only what is new when a session changes', async () => {
    const library = reader({
      plan_sessions: [{ ...SESSION, kind: 'mobility', video_ids: ['v1'] }],
      videos: [{ yt_id: 'v1', title: 'Old', duration_s: 300 }, { yt_id: 'v2', title: 'New', duration_s: 600 }],
    })
    const { lines } = await prepare([{ action: 'change', session_id: 's1', video_ids: ['v1', 'v2'] }], library)
    expect(lines).toEqual(['Change “Arch strength”', 'Video: New (10 min)'])
  })

  it('never shows an empty card: every accepted change has a line', async () => {
    const tries = [
      { action: 'change', session_id: 's1', video_ids: ['v1'] },
      { action: 'change', session_id: 's1', exercises: ['chin_nod'] },
      { action: 'change', session_id: 's1', kind: 'stability' },
      { action: 'change', session_id: 's1', instructions: '' },
    ]
    for (const change of tries) expect((await prepare([change])).lines?.length).toBeGreaterThan(0)
  })

  it('tells the coach what he decided', () => {
    expect(decisionNotes([{ summary: 'A', status: 'applied' }, { summary: 'B', status: 'declined' }, { summary: 'C', status: 'stale' }])).toEqual([
      'Proposal "A": applied.',
      'Proposal "B": declined by him.',
      'Proposal "C": not applied, because the plan had changed meanwhile.',
    ])
    expect(userBlocks('Hi', 'Today.', [], ['Proposal "A": applied.'])[0].text).toBe('Today.\nProposal "A": applied.')
  })
})

describe('conversations', () => {
  const NOW = Date.parse('2026-11-02T12:00:00Z')
  const thread = { fingerprint: 'a', closed: false }

  it('goes on in the same conversation', () => {
    expect(needsNewThread(thread, '2026-11-02T08:00:00Z', 'a', NOW)).toBe(false)
    expect(needsNewThread(thread, null, 'a', NOW)).toBe(false)
  })

  it('starts anew with no conversation, after a closed one, after a change or a long pause', () => {
    expect(needsNewThread(null, null, 'a', NOW)).toBe(true)
    expect(needsNewThread({ ...thread, closed: true }, '2026-11-02T08:00:00Z', 'a', NOW)).toBe(true)
    expect(needsNewThread(thread, '2026-11-02T08:00:00Z', 'b', NOW)).toBe(true)
    expect(needsNewThread(thread, '2026-11-01T11:59:00Z', 'a', NOW)).toBe(true)
    expect(needsNewThread(thread, '2026-11-01T12:00:00Z', 'a', NOW)).toBe(false)
  })

  it('keeps the date out of the system prompt, which must not change', () => {
    expect(systemPrompt('  ')).toBe(systemPrompt(''))
    expect(systemPrompt('His name is Test.')).toContain('About this person:\nHis name is Test.')
    expect(systemPrompt('')).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(systemPrompt('')).not.toContain('About this person')
  })

  it('tells the coach the rules that matter most', () => {
    const guide = systemPrompt('')
    for (const word of ['None', 'Mild', 'Moderate', 'Severe', 'Unbearable', 'A bit', 'A lot']) expect(guide).toContain(word)
    for (const rule of ['48 hours', '2 clean runs in a row', 'weekly averages', 'not a doctor', 'Apply and No', 'get_run_ladder', '07:00', 'Markdown']) expect(guide).toContain(rule)
    for (const slug of Object.keys(EXERCISES)) expect(guide).toContain(slug)
    expect(guide).not.toMatch(/\d\/10/) // pain in words, never numbers
  })

  it('keeps who he is out of the repo', () => {
    const guide = systemPrompt('')
    expect(guide).not.toMatch(/Pedro|engineer|@|[0-9a-f]{8}-[0-9a-f]{4}-/i)
  })

  it('puts the end of the last conversation in the first message only', () => {
    expect(userBlocks('Hi', 'Today.')).toEqual([{ type: 'text', text: 'Today.' }, { type: 'text', text: 'Hi' }])
    const [first, second] = userBlocks('Hi', 'Today.', [{ role: 'user', text: 'A' }, { role: 'assistant', text: 'B' }])
    expect(first.text).toBe('Today.\n\n<earlier_conversation>\nHim: A\nCoach: B\n</earlier_conversation>')
    expect(second.text).toBe('Hi')
  })

  it('shows only the words of a reply', () => {
    expect(visibleText([{ type: 'thinking' }, { type: 'text', text: ' Hi ' }, { type: 'tool_use' }])).toBe('Hi')
    expect(visibleText([{ type: 'tool_use' }])).toBe('')
  })

  it('keeps the limits that were decided', () => {
    expect(MODEL).toBe('claude-opus-5-5')
    expect(MAX_CHARS).toBe(2000)
    expect(MAX_TOOL_ROUNDS).toBe(5)
  })

  it('has the same longest message as the app', () => {
    expect(MAX_CHARS).toBe(CHAT_MAX_CHARS)
  })
})

describe('the date', () => {
  it('reads the clock where he lives', () => {
    expect(appMoment(new Date('2026-11-09T17:42:00Z'))).toEqual({ today: '2026-11-09', label: 'Today is Monday 2026-11-09, 18:42.' })
  })

  it('follows summer time', () => {
    expect(appMoment(new Date('2026-07-01T08:30:00Z')).label).toBe('Today is Wednesday 2026-07-01, 10:30.')
  })

  it('stays on the day before until 04:00, like the app', () => {
    expect(appMoment(new Date('2026-11-02T01:30:00Z'))).toEqual({ today: '2026-11-01', label: 'Today is Sunday 2026-11-01, 02:30.' })
    expect(appMoment(new Date('2026-11-02T03:00:00Z')).today).toBe('2026-11-02')
    expect(appMoment(new Date('2026-07-01T01:59:00Z')).today).toBe('2026-06-30') // 03:59 in summer
    expect(appMoment(new Date('2026-07-01T02:00:00Z')).today).toBe('2026-07-01')
  })
})

describe('found in review', () => {
  it('a day that is not on the calendar is not a date', () => {
    expect(() => period({ from: '2026-02-30', to: '2026-03-02' })).toThrow()
    expect(period({ from: '2028-02-29', to: '2028-03-02' })).toEqual({ from: '2028-02-29', to: '2028-03-02' })
  })
})

describe('what changed outside the chat', () => {
  const nothing = { sessions: [], note: false, logDays: [] }

  it('says nothing when nothing changed', () => {
    expect(changeNotes(nothing)).toEqual([])
  })

  it('names the days of changed sessions once each, in date order', () => {
    expect(changeNotes({ ...nothing, sessions: [{ date: '2026-11-14' }, { date: '2026-11-10' }, { date: '2026-11-10' }] })).toEqual([
      'The plan changed outside this chat since your last message (Tue 10 Nov, Sat 14 Nov): read those days again before you answer about them.',
    ])
  })

  it('names the plan and the logs in one line', () => {
    expect(changeNotes({ sessions: [{ date: '2026-11-10' }, { date: '2026-11-11' }, { date: '2026-11-14' }], note: false, logDays: ['2026-11-09'] })).toEqual([
      'The plan changed outside this chat since your last message (Tue 10 Nov, Wed 11 Nov, Sat 14 Nov), and there are new logs (Mon 9 Nov): read those days again before you answer about them.',
    ])
  })

  it('names at most 7 days', () => {
    const sessions = Array.from({ length: 9 }, (_, i) => ({ date: `2026-11-${10 + i}` }))
    const [line] = changeNotes({ ...nothing, sessions })
    expect(line).toContain('(Tue 10 Nov, Wed 11 Nov, Thu 12 Nov, Fri 13 Nov, Sat 14 Nov, Sun 15 Nov, Mon 16 Nov and other days)')
    expect(line).not.toContain('17 Nov')
  })

  it('has its own words for logs only, and for the weekly note', () => {
    expect(changeNotes({ ...nothing, logDays: ['2026-11-09'] })).toEqual(['There are new logs since your last message (Mon 9 Nov): read those days again before you answer about them.'])
    expect(changeNotes({ ...nothing, note: true })).toEqual(['The weekly note changed outside this chat since your last message: read it again before you answer about it.'])
    expect(changeNotes({ sessions: [{ date: '2026-11-10' }], note: true, logDays: [] })).toEqual([
      'The plan changed outside this chat since your last message (Tue 10 Nov), and the weekly note changed: read those days and the note again before you answer about them.',
    ])
  })

  it('reads the changes since the last message with his own login, and only what it needs', async () => {
    const { reader, asked } = tablesDb({
      plan_sessions: [{ date: '2026-11-10' }],
      reviews: [],
      session_logs: [{ logged_at: '2026-11-09T22:40:00Z', plan_sessions: { date: '2026-11-09' } }],
    })
    expect(await changesSince(reader, '2026-11-09T22:28:00Z')).toEqual([
      'The plan changed outside this chat since your last message (Tue 10 Nov), and there are new logs (Mon 9 Nov): read those days again before you answer about them.',
    ])
    expect(asked.map((a) => a.table)).toEqual(['plan_sessions', 'reviews', 'session_logs'])
    for (const a of asked) expect(a.columns).not.toMatch(/raw|user_id|comment|\*/)
  })

  it('asks only for what is newer than the last message', async () => {
    const { reader, asked } = fakeDb([])
    expect(await changesSince(reader, '2026-11-09T22:28:00Z')).toEqual([])
    expect(asked.map((a) => a.calls.find(([name]) => name === 'gt'))).toEqual([
      ['gt', ['updated_at', '2026-11-09T22:28:00Z']],
      ['gt', ['updated_at', '2026-11-09T22:28:00Z']],
      ['gt', ['logged_at', '2026-11-09T22:28:00Z']],
    ])
  })

  it('goes on without a note when the changes cannot be read', async () => {
    const { reader } = fakeDb([], { message: 'inner secret' })
    expect(await changesSince(reader, '2026-11-09T22:28:00Z')).toEqual([])
  })

  it('the guide tells the coach to read again before it answers about a day', () => {
    const guide = systemPrompt('')
    expect(guide).toContain('What you read earlier in this conversation can be out of date.')
    expect(guide).toContain('read it again with your tools in this turn')
    expect(guide).toContain('read the plan for that day again before you say it isn')
  })
})
