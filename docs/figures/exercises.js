// Pisada exercise catalog + figure definitions (flat-colour style). Depends on rig.js.
// Pose angles are unchanged from the 14 Oct line-figure version; only the rendering changed.
(function (root) {
  const R = root.PisadaRig || require('./rig.js');
  const { solve, limb, body, render, bbox, arrow, footRp, lerp, pt, f } = R;
  const GROUND = 238;
  const hl = (...a) => new Set(a);

  const STAND = { tl: 3, tu: 2, nk: 6, hd: 90 };
  const LIFTED = { th: 196, sh: 252, ft: 162 };
  const reachWall = (x) => ({ reach: { x: x - 1.5, dy: 20 } });
  const SEATED_LEGS = { near: { th: 90, sh: 180, ft: 90 }, far: { th: 90, sh: 180, ft: 90 } };

  function heelRaise(ft, o) {
    const flat = { th: 180, sh: 180, ft, toe: 90 };
    return solve({ ...STAND, near: flat, far: o.single ? LIFTED : flat, arm: reachWall(o.wallX), anchor: { at: 'near.ball', to: o.ballAt } });
  }
  const chairItems = (j, top) => [{ k: 'chair', bx: j.P.x - 15, seatY: j.P.y + 8, fx: j.P.x + 34, gy: j.near.ball.y, top }, { k: 'ground', y: j.near.ball.y }];
  const liftArrow = (j, y0, x = j.near.heel.x - 15) => ({ k: 'arrow', pts: [pt(x, y0), pt(x, j.near.heel.y - 4)] });

  const EX = [
    {
      slug: 'chin_nod', name: 'Chin nod', session: 'Neck micro-dose', dose: '10 × 5 s hold',
      setup: 'Sit tall, back and back of the head resting on the chair back.',
      cues: ['Small “yes” nod', 'Head stays on the chair', 'Jaw relaxed'], donts: ['Chin poking forward', 'Hands on the head'],
      frames: [90, 122].map((hd, i) => () => {
        const j = solve({ tl: -9, tu: -9, nk: -8, hd, ...SEATED_LEGS, arm: { ua: 162, fa: 132 }, anchor: { at: 'P', to: [70, 150] } });
        const s = [...chairItems(j, pt(j.Hc.x - 12.5, j.Hc.y - 12)), ...body(j, hl('neck', 'head'), { farDx: -4 })];
        if (i) s.push({ k: 'arc', c: j.Hc, r: 22, a0: 62, a1: 132 });
        return s;
      }),
    },
    {
      slug: 't_hold', name: 'T-hold', session: 'Neck micro-dose', dose: '3 × 15 s hold',
      setup: 'Sit tall, away from the chair back.',
      cues: ['Thumbs up', 'Shoulders down and back', 'Chest forward'], donts: ['Shrugging', 'Head poking forward'],
      frameW: 200,
      frames: [() => {
        const cx = 100, sy = 104, py = 160, gy = GROUND, s = [];
        s.push({ k: 'chairF', x0: cx - 40, x1: cx + 40, y: py + 10, legs: [cx - 36, cx + 36], gy }, { k: 'ground', y: gy, x0: 20, x1: 180 });
        for (const sd of [-1, 1]) {
          s.push(limb('thigh', [pt(cx + sd * 10, py), pt(cx + sd * 12, py + 14)]), limb('shank', [pt(cx + sd * 12, py + 14), pt(cx + sd * 12, gy - 8)]),
            limb('foot', [pt(cx + sd * 12, gy - 8), pt(cx + sd * 13, gy - 3)], { r: [4.5, 4] }));
        }
        s.push(limb('lower', [pt(cx - 9, py), pt(cx + 9, py)], { r: [10, 10] }), limb('upper', [pt(cx, py - 2), pt(cx, sy + 11)], { r: [12, 13.5] }));
        s.push(limb('neck', [pt(cx, sy + 4), pt(cx, sy - 9)]), { k: 'head', c: pt(cx, sy - 20), hd: null });
        for (const sd of [-1, 1]) {
          const y = sy + 2;
          s.push(limb('upperArm', [pt(cx + sd * 13, y), pt(cx + sd * 50, y)], { hl: 1 }), limb('forearm', [pt(cx + sd * 50, y), pt(cx + sd * 78, y)], { hl: 1 }),
            limb('hand', [pt(cx + sd * 78, y), pt(cx + sd * 87, y)], { hl: 1 }), limb('thumb', [pt(cx + sd * 84, y - 2), pt(cx + sd * 84, y - 10)], { hl: 1 }));
        }
        return s;
      }],
      inset: () => [
        { k: 'ring', c: pt(55, 125), r: 52 },
        limb('lower', [pt(50, 172), pt(48, 140)]), limb('upper', [pt(48, 140), pt(53, 100)]), limb('neck', [pt(53, 100), pt(54, 91)]),
        { k: 'head', c: pt(56, 80), hd: 90 }, { k: 'mark', c: pt(46, 106), r: 4.5 },
        { k: 'arrow', pts: [pt(70, 118), pt(90, 118)] }, { k: 'arc', c: pt(44, 112), r: 17, a0: 292, a1: 228 },
      ],
    },
    {
      slug: 'thoracic_ext_chair', name: 'Thoracic extension over the chair', session: 'Neck micro-dose', dose: '6 slow reps',
      setup: 'Sit with the top of the chair back at the bottom of your shoulder blades, arms crossed on the chest.',
      cues: ['Bend over the chair edge', 'Head follows the chest', 'Slow'], donts: ['Hands on the head', 'Looking up at the end'],
      frames: [
        { tl: 0, tu: 0, nk: 4, hd: 90, ua: 168, fa: 18 },
        { tl: -4, tu: -30, nk: -22, hd: 72, ua: 138, fa: -12 },
      ].map((p) => () => {
        const j = solve({ ...p, ...SEATED_LEGS, arm: { ua: p.ua, fa: p.fa }, anchor: { at: 'P', to: [76, 150] } });
        return [...chairItems(j, pt(j.P.x - 12, j.P.y - 24)), ...body(j, hl('upper'), { farDx: -4 })];
      }),
    },
    {
      slug: 'ball_squeeze_heel_raise', name: 'Ball-squeeze heel raise', session: 'Tendon block · wk 1–2', dose: '3 × 15 · right +1 set',
      tempo: '3 s up · 3 s down',
      setup: 'Stand with a small ball or rolled towel squeezed between the heels, fingertips on a wall.',
      cues: ['Squeeze the ball the whole time', 'Straight up', 'Weight over the big toe'], donts: ['Heels drifting apart', 'Rolling onto the little toe'],
      frames: [90, 132].map((ft, i) => () => {
        const j = heelRaise(ft, { wallX: 142, ballAt: [100, GROUND] });
        const s = [{ k: 'ground', y: GROUND }, { k: 'wall', x: 142, y0: 40, y1: GROUND }, ...body(j, hl('nearShank', 'nearFoot'), { farDx: -4 }),
          { k: 'ball', c: lerp(j.near.heel, j.near.A, 0.5), r: 5.5 }];
        if (i) s.push(liftArrow(j, GROUND - 3, j.near.heel.x - 17));
        return s;
      }),
      inset: () => [
        { k: 'ring', c: pt(55, 125), r: 52 }, { k: 'ground', y: 156, x0: 14, x1: 96 },
        limb('shank', [pt(44, 84), pt(44, 146)], { r: [7.5, 4.5] }), limb('ankle', [pt(44, 146), pt(44, 152)], { r: [4.5, 4.5] }),
        limb('shank', [pt(66, 84), pt(66, 146)], { hl: 1, r: [7.5, 4.5] }), limb('ankle', [pt(66, 146), pt(66, 152)], { hl: 1, r: [4.5, 4.5] }),
        { k: 'ball', c: pt(55, 145), r: 5.5 },
        { k: 'arrow', pts: [pt(14, 128), pt(33, 128)] }, { k: 'arrow', pts: [pt(96, 128), pt(77, 128)] },
      ],
    },
    {
      slug: 'sl_heel_raise_step', name: 'Single-leg heel raise on a step', session: 'Tendon block · wk 3–4', dose: '3 × 8–12 per side · right +1 set',
      tempo: '3 s up · 3 s down',
      setup: 'Right foot on a step edge, heel off the back, other foot lifted, fingertips on a wall.',
      cues: ['Full height at the top', 'Lower below the step', 'Drive through the big toe'], donts: ['Rolling to the outside', 'Bouncing at the bottom'],
      frames: [132, 64].map((ft, i) => () => {
        const sy = 218;
        const j = heelRaise(ft, { single: true, wallX: 150, ballAt: [96, sy] });
        const s = [{ k: 'ground', y: GROUND }, { k: 'block', x0: 91, y: sy, x1: 150, gy: GROUND }, { k: 'wall', x: 150, y0: 40, y1: sy },
          { k: 'dash', pts: [pt(40, sy), pt(88, sy)] }, ...body(j, hl('nearShank', 'nearFoot'))];
        if (i) s.push({ k: 'arrow', pts: [pt(j.near.heel.x - 16, sy - 32), pt(j.near.heel.x - 16, j.near.heel.y)] });
        return s;
      }),
    },
    {
      slug: 'banded_inversion', name: 'Banded foot inversion', session: 'Tendon block', dose: '3 × 15 · right +1 set',
      tempo: 'about 2 s each way',
      setup: 'Sit with the right leg crossed over the left knee. Band around the forefoot, anchored to the outside.',
      cues: ['Move only the foot', 'Sweep in and up', 'Control the way back'], donts: ['Rotating the whole leg'],
      frameW: 190,
      frames: [[12, 0], [-30, 12]].map(([rot, dx], i) => () => {
        const A = pt(105 + dx, 120), rp = footRp({ A, rot });
        const s = [{ k: 'post', x: 22, y0: 112, y1: GROUND }, { k: 'ground', y: GROUND, x0: 8, x1: 60 },
          { k: 'band', pts: [pt(22, 150), rp(-22, 34)] },
          limb('shank', [pt(105, 20), A], { hl: 1, r: [8.5, 5.5] }), { k: 'footFront', A, rot, hl: 1 }];
        if (i) s.push({ k: 'arc', c: pt(105, 120), r: 70, a0: 202, a1: 156 });
        return s;
      }),
    },
    {
      slug: 'sl_heel_hold_towel', name: 'Single-leg heel-raised hold on a towel', session: 'Tendon block', dose: '3 × 30 s per side · right +1 set',
      setup: 'Stand on the right foot on a folded towel or cushion, heel raised, other foot lifted, fingertips on a wall.',
      cues: ['Heel high', 'Ankle doesn’t roll out', 'Breathe'], donts: ['Rolling to the outside', 'Gripping the support'],
      frames: [() => {
        const ty = GROUND - 7;
        const j = heelRaise(124, { single: true, wallX: 142, ballAt: [100, ty] });
        return [{ k: 'ground', y: GROUND }, { k: 'wall', x: 142, y0: 40, y1: GROUND }, { k: 'towel', x: 70, y: ty, w: 56, h: 7 },
          ...body(j, hl('nearShank', 'nearFoot'))];
      }],
    },
    {
      slug: 'sl_heel_raise_test', name: 'Single-leg heel raises to fatigue', session: 'Test · baseline 16 Oct · retest 12 Nov', dose: 'Max reps, left then right',
      tempo: '2 s up · 2 s down',
      setup: 'Stand on one foot on the flat floor, fingertips on a wall for balance only.',
      cues: ['Full height every rep', 'Same tempo', 'Fingertips only'], donts: ['Bending the knee', 'Leaning on the wall'],
      stop: 'Stop when you can’t reach full height, lose the tempo, or pain goes above 3/10.',
      frames: [90, 132].map((ft, i) => () => {
        const j = heelRaise(ft, { single: true, wallX: 142, ballAt: [100, GROUND] });
        const s = [{ k: 'ground', y: GROUND }, { k: 'wall', x: 142, y0: 40, y1: GROUND }, ...body(j, hl('nearShank', 'nearFoot'))];
        if (i) s.push(liftArrow(j, GROUND - 3));
        return s;
      }),
    },
  ];

  // Strip: frames left to right, a small grey arrow between them, optional inset at the end.
  // inset: true only in the enlarged view. endOnly: just the last frame (thumbnail option).
  // The viewBox is cropped to the content, so thumbnails fill their box.
  function strip(ex, { inset = true, endOnly = false, pad = 10 } = {}) {
    const FW = ex.frameW || 170, GAP = 30;
    const scenes = (endOnly ? [ex.frames[ex.frames.length - 1]] : ex.frames).map((fr) => fr());
    const bb = scenes.map(bbox).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
    const fx0 = Math.max(0, bb.x0 - pad), fw = Math.min(FW, bb.x1 + pad) - fx0;
    let y0 = bb.y0 - pad, y1 = bb.y1 + pad, x = 0, g = '';
    scenes.forEach((sc, i) => {
      if (i) { g += arrow([pt(x + 8, (y0 + y1) / 2), pt(x + GAP - 6, (y0 + y1) / 2)], 'var(--fig-prop)', true); x += GAP; }
      g += `<g transform="translate(${f(x - fx0)},0)">${render(sc)}</g>`; x += fw;
    });
    if (inset && ex.inset) {
      const sc = ex.inset(), ib = bbox(sc);
      y0 = Math.min(y0, ib.y0 - 4); y1 = Math.max(y1, ib.y1 + 4);
      x += 14; g += `<g transform="translate(${f(x - ib.x0)},0)">${render(sc)}</g>`; x += ib.x1 - ib.x0;
    }
    const h = y1 - y0;
    return { svg: `<svg viewBox="0 ${f(y0)} ${f(x)} ${f(h)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ex.name}">${g}</svg>`, w: x, h };
  }

  root.PisadaExercises = { EX, strip };
  if (typeof module !== 'undefined') module.exports = root.PisadaExercises;
})(typeof window !== 'undefined' ? window : globalThis);
