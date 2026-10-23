// Screenshots of the demo at phone size (360 × 800), for reviews and the PR.
// Usage: node scripts/demo-shots.mjs <out-folder> [base-url]
//   base-url defaults to http://localhost:4173/pisada/demo/ (npm run build, then npx vite preview)
// Each shot: a scenario (see src/demo/state.ts), then optional steps (taps) before the picture.
// Needs Playwright with Chromium (npx playwright, or a global install).
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = require(path.join(process.env.NODE_PATH ?? '/opt/node22/lib/node_modules', 'playwright')))
}

const out = process.argv[2] ?? 'screens'
const base = process.argv[3] ?? 'http://localhost:4173/pisada/demo/'
const only = process.env.ONLY?.split(',')
mkdirSync(out, { recursive: true })

const text = (t) => (p) => p.getByText(t, { exact: false }).first().click()
const role = (r, name) => (p) => p.getByRole(r, { name }).first().click()
const swipeUp = async (p) => p.mouse.wheel(0, 2000)
const wait = (ms) => (p) => p.waitForTimeout(ms)
// close any sheet that opened by itself (morning and evening check-ins can both open)
const closeSheets = async (p) => {
  for (let i = 0; i < 3 && (await p.locator('[data-vaul-overlay][data-state="open"]').count()); i++) {
    await p.keyboard.press('Escape')
    await p.waitForTimeout(450)
  }
}

// name, scenario, steps
export const SHOTS = [
  ['01-today-morning', 'today', [wait(600)]],
  ['02-today', 'today', [wait(400), closeSheets, wait(500)]],
  ['03-today-scrolled', 'today', [wait(400), closeSheets, wait(400), swipeUp, wait(300)]],
  ['04-session-neck', 'today', [wait(400), closeSheets, wait(300), text('Neck micro-dose'), wait(400)]],
  ['05-log-drawer', 'ordinary', [wait(400), closeSheets, wait(300), text('Run A'), wait(300), role('button', /Log session|Edit/), wait(500)]],
  ['06-exercise', 'today', [wait(400), closeSheets, wait(300), text('Neck micro-dose'), wait(300), text('Chin nod'), wait(400)]],
  ['07-test-day', 'test-day', [wait(400), closeSheets, wait(300), text('Heel-raise test'), wait(400)]],
  ['08-evening', 'bike', [wait(800)]],
  ['09-progress', 'today', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(500)]],
  ['10-progress-scrolled', 'today', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(500), swipeUp, wait(300)]],
  ['11-neck-detail', 'bike', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(500), text('Neck'), wait(500)]],
  ['12-neck-detail-bottom', 'bike', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(500), text('Neck'), wait(500), swipeUp, wait(300)]],
  ['13-activities', 'today', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(400), role('tab', /activities/i), wait(500)]],
  ['14-weight', 'today', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(500), text('Weight'), wait(500)]],
  ['15-flare', 'flare', [wait(400), closeSheets, wait(500)]],
  ['16-sick', 'sick', [wait(400), closeSheets, wait(500)]],
  ['17-late', 'late', [wait(400), closeSheets, wait(500)]],
  ['18-day-one', 'day-one', [wait(400), closeSheets, wait(500)]],
  ['19-day-one-progress', 'day-one', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(500)]],
  ['20-gap', 'gap', [wait(400), closeSheets, wait(500)]],
  ['21-run-session', 'ordinary', [wait(400), closeSheets, wait(300), text('Run A'), wait(500)]],
  ['22-moved', 'moved', [wait(400), closeSheets, wait(500)]],
  ['23-new-block', 'new-block', [wait(400), closeSheets, wait(500)]],
  ['24-ladder', 'today', [wait(400), closeSheets, wait(300), role('button', 'Progress'), wait(500), text('Run ladder'), wait(600)]],
]

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined })
const failures = []
for (const [name, scenario, steps] of SHOTS) {
  if (only && !only.some((o) => name.includes(o))) continue
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'en-GB',
    timezoneId: 'Europe/Madrid',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    await page.goto(`${base}?scenario=${scenario}&bar=0`, { waitUntil: 'networkidle' })
    for (const step of steps) await step(page)
    await page.screenshot({ path: path.join(out, `${name}.png`) })
    if (errors.length) failures.push(`${name}: ${errors.join('; ')}`)
  } catch (e) {
    failures.push(`${name}: ${e.message.split('\n')[0]}`)
  }
  await context.close()
}
await browser.close()
if (failures.length) {
  console.log('Problems:\n' + failures.join('\n'))
  process.exitCode = 1
} else console.log(`Saved to ${out}`)
