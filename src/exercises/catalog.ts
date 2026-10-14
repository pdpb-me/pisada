// Pisada exercise catalog + figure definitions (style B).
// Ported from docs/figures/exercises.js (the approved drawings). Keep every number as is.
// plan_sessions.exercises holds these slugs; an unknown slug shows nothing.
import {
  arc,
  arrow,
  circle,
  defs as rigDefs,
  draw,
  lerp,
  line,
  solve,
  type LegPose,
  type Part,
  type Pose,
} from '@/exercises/rig'

export type Exercise = {
  slug: string
  name: string
  session: string
  dose: string
  tempo?: string
  setup: string
  cues: string[]
  donts: string[]
  stop?: string
  frameW?: number
  frames: (() => string)[]
  inset?: () => string
}

const FH = 250,
  GAP = 30,
  GROUND = 238
const hl = (...a: Part[]) => new Set(a)
const ground = (y: number, x0 = 8, x1 = 162) =>
  line(
    [
      { x: x0, y },
      { x: x1, y },
    ],
    'prop',
  )
const wall = (x: number, y1: number, y0 = 40) =>
  line(
    [
      { x, y: y0 },
      { x, y: y1 },
    ],
    'prop',
  )

const STAND = { tl: 3, tu: 2, nk: 6, hd: 90 }
const LIFTED: LegPose = { th: 196, sh: 252, ft: 162 }
const reachWall = (x: number) => ({ reach: { x: x - 1.5, dy: 20 } })

// ---------- standing, side view ----------
function heelRaise(ft: number, opt: { single?: boolean; wallX: number; ballAt: [number, number] }) {
  const ps: Pose = {
    ...STAND,
    near: { th: 180, sh: 180, ft, toe: 90 },
    far: opt.single ? LIFTED : { th: 180, sh: 180, ft, toe: 90 },
    arm: reachWall(opt.wallX),
    anchor: { at: 'near.ball', to: opt.ballAt },
  }
  return solve(ps)
}

function chair(j: ReturnType<typeof solve>, topPt: { x: number; y: number }) {
  const seatY = j.P.y + 8,
    bx = j.P.x - 15,
    gy = j.near.ball.y
  return (
    line(
      [
        { x: bx, y: gy },
        { x: bx, y: seatY },
        { x: j.P.x + 34, y: seatY },
        { x: j.P.x + 34, y: gy },
      ],
      'prop',
    ) +
    line([{ x: bx, y: seatY }, topPt], 'prop') +
    ground(gy)
  )
}

const SEATED_LEGS = { near: { th: 90, sh: 180, ft: 90 }, far: { th: 90, sh: 180, ft: 90 } }

export const EXERCISES: Exercise[] = [
  {
    slug: 'chin_nod',
    name: 'Chin nod',
    session: 'Neck micro-dose',
    dose: '10 × 5 s hold',
    setup: 'Sit tall, back and back of the head resting on the chair back.',
    cues: ['Small “yes” nod', 'Head stays on the chair', 'Jaw relaxed'],
    donts: ['Chin poking forward', 'Hands on the head'],
    frames: [90, 122].map((hd, i) => () => {
      const j = solve({
        tl: -9,
        tu: -9,
        nk: -8,
        hd,
        ...SEATED_LEGS,
        arm: { ua: 162, fa: 132 },
        anchor: { at: 'P', to: [70, 150] },
      })
      let g = chair(j, { x: j.Hc.x - 12.5, y: j.Hc.y - 12 }) + draw(j, hl('neck', 'head'), { farDx: -4 })
      if (i) g += arc(j.Hc, 20, 62, 128)
      return g
    }),
  },
  {
    slug: 't_hold',
    name: 'T-hold',
    session: 'Neck micro-dose',
    dose: '3 × 15 s hold',
    setup: 'Sit tall, away from the chair back.',
    cues: ['Thumbs up', 'Shoulders down and back', 'Chest forward'],
    donts: ['Shrugging', 'Head poking forward'],
    frameW: 200,
    frames: [
      () => {
        const cx = 100,
          sy = 104,
          py = 160,
          gy = GROUND
        let g = ''
        g += line([{ x: cx - 40, y: py + 10 }, { x: cx + 40, y: py + 10 }], 'prop')
        g +=
          line([{ x: cx - 36, y: py + 10 }, { x: cx - 36, y: gy }], 'prop') +
          line([{ x: cx + 36, y: py + 10 }, { x: cx + 36, y: gy }], 'prop') +
          ground(gy, 20, 180)
        g += line([{ x: cx - 10, y: py }, { x: cx - 12, y: py + 14 }, { x: cx - 12, y: gy - 6 }, { x: cx - 20, y: gy - 2 }], 'body')
        g += line([{ x: cx + 10, y: py }, { x: cx + 12, y: py + 14 }, { x: cx + 12, y: gy - 6 }, { x: cx + 20, y: gy - 2 }], 'body')
        g += line([{ x: cx - 10, y: py }, { x: cx + 10, y: py }], 'body') + line([{ x: cx, y: py }, { x: cx, y: sy }], 'body')
        g += line([{ x: cx, y: sy }, { x: cx, y: sy - 9 }], 'body') + circle({ x: cx, y: sy - 20 }, 11, 'body')
        g += line([{ x: cx - 88, y: sy + 2 }, { x: cx - 16, y: sy + 2 }, { x: cx, y: sy }, { x: cx + 16, y: sy + 2 }, { x: cx + 88, y: sy + 2 }], 'accent')
        g +=
          line([{ x: cx - 84, y: sy + 2 }, { x: cx - 84, y: sy - 8 }], 'accent') +
          line([{ x: cx + 84, y: sy + 2 }, { x: cx + 84, y: sy - 8 }], 'accent')
        return g
      },
    ],
    inset: () => {
      const c = { x: 55, y: 125 }
      let g = circle(c, 52, 'prop')
      const P = { x: 50, y: 172 },
        S = { x: 53, y: 100 }
      g += line([P, { x: 48, y: 140 }, S], 'body') + line([S, { x: 54, y: 91 }], 'body') + circle({ x: 56, y: 80 }, 11, 'body')
      g += circle({ x: 53, y: 103 }, 3.5, 'accent')
      g += arrow([{ x: 62, y: 118 }, { x: 84, y: 118 }])
      g += arc({ x: 48, y: 110 }, 15, 200, 250)
      return g
    },
  },
  {
    slug: 'thoracic_ext_chair',
    name: 'Thoracic extension over the chair',
    session: 'Neck micro-dose',
    dose: '6 slow reps',
    setup: 'Sit with the top of the chair back at the bottom of your shoulder blades, arms crossed on the chest.',
    cues: ['Bend over the chair edge', 'Head follows the chest', 'Slow'],
    donts: ['Hands on the head', 'Looking up at the end'],
    frames: [
      { tl: 0, tu: 0, nk: 4, hd: 90, ua: 168, fa: 18 },
      { tl: -4, tu: -30, nk: -22, hd: 72, ua: 138, fa: -12 },
    ].map((p) => () => {
      const j = solve({ ...p, ...SEATED_LEGS, arm: { ua: p.ua, fa: p.fa }, anchor: { at: 'P', to: [76, 150] } })
      return chair(j, { x: j.P.x - 12, y: j.P.y - 24 }) + draw(j, hl('upper'), { farDx: -4 })
    }),
  },
  {
    slug: 'ball_squeeze_heel_raise',
    name: 'Ball-squeeze heel raise',
    session: 'Tendon block · wk 1–2',
    dose: '3 × 15 · right +1 set',
    tempo: '3 s up · 3 s down',
    setup: 'Stand with a small ball or rolled towel squeezed between the heels, fingertips on a wall.',
    cues: ['Squeeze the ball the whole time', 'Straight up', 'Weight over the big toe'],
    donts: ['Heels drifting apart', 'Rolling onto the little toe'],
    frames: [90, 132].map((ft, i) => () => {
      const j = heelRaise(ft, { wallX: 142, ballAt: [100, GROUND] })
      let g = ground(GROUND) + wall(142, GROUND) + draw(j, hl('nearShank', 'nearFoot'), { farDx: -4 })
      g += circle(lerp(j.near.heel, j.near.A, 0.5), 5, 'accent')
      if (i) g += arrow([{ x: j.near.heel.x - 12, y: GROUND - 3 }, { x: j.near.heel.x - 12, y: j.near.heel.y - 2 }])
      return g
    }),
    inset: () => {
      const c = { x: 55, y: 125 }
      let g = circle(c, 52, 'prop')
      g += line([{ x: 44, y: 82 }, { x: 44, y: 150 }], 'body') + line([{ x: 66, y: 82 }, { x: 66, y: 150 }], 'accent')
      g += circle({ x: 55, y: 146 }, 6, 'accent')
      g += arrow([{ x: 18, y: 146 }, { x: 34, y: 146 }]) + arrow([{ x: 92, y: 146 }, { x: 76, y: 146 }])
      return g
    },
  },
  {
    slug: 'sl_heel_raise_step',
    name: 'Single-leg heel raise on a step',
    session: 'Tendon block · wk 3–4',
    dose: '3 × 8–12 per side · right +1 set',
    tempo: '3 s up · 3 s down',
    setup: 'Right foot on a step edge, heel off the back, other foot lifted, fingertips on a wall.',
    cues: ['Full height at the top', 'Lower below the step', 'Drive through the big toe'],
    donts: ['Rolling to the outside', 'Bouncing at the bottom'],
    frames: [132, 64].map((ft, i) => () => {
      const sy = 218
      const j = heelRaise(ft, { single: true, wallX: 150, ballAt: [96, sy] })
      let g = ground(GROUND) + line([{ x: 91, y: GROUND }, { x: 91, y: sy }, { x: 150, y: sy }], 'prop') + wall(150, sy)
      g += line([{ x: 40, y: sy }, { x: 88, y: sy }], 'prop', ' stroke-dasharray="3 4"')
      g += draw(j, hl('nearShank', 'nearFoot'))
      if (i) g += arrow([{ x: j.near.heel.x - 12, y: sy - 34 }, { x: j.near.heel.x - 12, y: j.near.heel.y }])
      return g
    }),
  },
  {
    slug: 'banded_inversion',
    name: 'Banded foot inversion',
    session: 'Tendon block',
    dose: '3 × 15 · right +1 set',
    tempo: 'about 2 s each way',
    setup: 'Sit with the right leg crossed over the left knee. Band around the forefoot, anchored to the outside.',
    cues: ['Move only the foot', 'Sweep in and up', 'Control the way back'],
    donts: ['Rotating the whole leg'],
    frameW: 190,
    frames: [
      [12, 0],
      [-30, 12],
    ].map(([rot, dx], i) => () => {
      const A = { x: 105 + dx, y: 120 }
      const rp = (x: number, y: number) => {
        const r = (rot * Math.PI) / 180
        return { x: A.x + x * Math.cos(r) - y * Math.sin(r), y: A.y + x * Math.sin(r) + y * Math.cos(r) }
      }
      const outer = rp(-24, 42),
        inner = rp(26, 42)
      let g = line([{ x: 22, y: 112 }, { x: 22, y: GROUND }], 'prop') + ground(GROUND, 8, 60)
      g += line([{ x: 22, y: 150 }, rp(-22, 34)], 'prop')
      g += line([{ x: 105, y: 20 }, A], 'accent')
      g += line([outer, A, inner], 'body') + line([outer, inner], 'accent')
      ;[
        [-18, 4],
        [-10, 4.5],
        [-2, 5],
        [7, 5.5],
        [17, 7],
      ].forEach(([x, r]) => (g += circle(rp(x, 42 - r - 3), r, 'body')))
      if (i) g += arc({ x: 105, y: 120 }, 66, 200, 158)
      return g
    }),
  },
  {
    slug: 'sl_heel_hold_towel',
    name: 'Single-leg heel-raised hold on a towel',
    session: 'Tendon block',
    dose: '3 × 30 s per side · right +1 set',
    setup: 'Stand on the right foot on a folded towel or cushion, heel raised, other foot lifted, fingertips on a wall.',
    cues: ['Heel high', 'Ankle doesn’t roll out', 'Breathe'],
    donts: ['Rolling to the outside', 'Gripping the support'],
    frames: [
      () => {
        const ty = GROUND - 7
        const j = heelRaise(124, { single: true, wallX: 142, ballAt: [100, ty] })
        return (
          ground(GROUND) +
          wall(142, GROUND) +
          `<rect x="72" y="${ty}" width="54" height="7" rx="3.5" fill="none" stroke="var(--fig-prop)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` +
          draw(j, hl('nearShank', 'nearFoot'))
        )
      },
    ],
  },
  {
    slug: 'sl_heel_raise_test',
    name: 'Single-leg heel raises to fatigue',
    session: 'Test · baseline 16 Oct · retest 12 Nov',
    dose: 'Max reps, left then right',
    tempo: '2 s up · 2 s down',
    setup: 'Stand on one foot on the flat floor, fingertips on a wall for balance only.',
    cues: ['Full height every rep', 'Same tempo', 'Fingertips only'],
    donts: ['Bending the knee', 'Leaning on the wall'],
    stop: 'Stop when you can’t reach full height, lose the tempo, or pain goes above 3/10.',
    frames: [90, 132].map((ft, i) => () => {
      const j = heelRaise(ft, { single: true, wallX: 142, ballAt: [100, GROUND] })
      let g = ground(GROUND) + wall(142, GROUND) + draw(j, hl('nearShank', 'nearFoot'))
      if (i) g += arrow([{ x: j.near.heel.x - 12, y: GROUND - 3 }, { x: j.near.heel.x - 12, y: j.near.heel.y - 2 }])
      return g
    }),
  },
]

export function exerciseFor(slug: string) {
  return EXERCISES.find((e) => e.slug === slug)
}

// Compose a strip: frames left to right, a neutral arrow between them, optional inset at the end.
export function strip(ex: Exercise, { inset = true } = {}) {
  const FW = ex.frameW || 170
  let x = 0,
    g = ''
  ex.frames.forEach((fr, i) => {
    if (i) {
      g += line([{ x: x + 6, y: FH / 2 }, { x: x + GAP - 8, y: FH / 2 }], 'prop', ' marker-end="url(#fig-ah-prop)"')
      x += GAP
    }
    g += `<g transform="translate(${x},0)">${fr()}</g>`
    x += FW
  })
  if (inset && ex.inset) {
    x += 14
    g += `<g transform="translate(${x},0)">${ex.inset()}</g>`
    x += 112
  }
  const defs = rigDefs.replace(
    '</defs>',
    `<marker id="fig-ah-prop" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="var(--fig-prop)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`,
  )
  return { svg: `<svg viewBox="0 0 ${x} ${FH}" xmlns="http://www.w3.org/2000/svg">${defs}${g}</svg>`, w: x, h: FH }
}
