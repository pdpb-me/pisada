// Pisada exercise figures — parametric line-figure rig (style B).
// Angles are absolute, in degrees: 0 = up, 90 = forward (right), 180 = down, 270 = back.
// Colours come from CSS variables: --fig-body, --fig-accent, --fig-prop.
(function (root) {
  const L = { tl: 26, tu: 32, nk: 9, hr: 11, ua: 28, fa: 27, hand: 7, th: 50, sh: 50 };
  const W = { body: 2.5, accent: 3, prop: 1.5 };

  const rad = (a) => (a * Math.PI) / 180;
  const dir = (a) => ({ x: Math.sin(rad(a)), y: -Math.cos(rad(a)) });
  const add = (p, a, l) => { const d = dir(a); return { x: p.x + d.x * l, y: p.y + d.y * l }; };
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const mv = (p, dx, dy) => ({ x: p.x + dx, y: p.y + dy });

  function leg(P, s) {
    const K = add(P, s.th, L.th), A = add(K, s.sh, L.sh);
    const u = dir(s.ft), n = dir(s.ft + 90);
    const base = { x: A.x + n.x * 9, y: A.y + n.y * 9 };
    const heel = { x: base.x - u.x * 7, y: base.y - u.y * 7 };
    const ball = { x: base.x + u.x * 17, y: base.y + u.y * 17 };
    const toe = add(ball, s.toe ?? s.ft, 8);
    return { K, A, heel, ball, toe, mid: lerp(heel, ball, 0.3) };
  }

  // Two-bone IK for an arm reaching a world point; elbow bends downward.
  function ik(S, T) {
    const dx = T.x - S.x, dy = T.y - S.y;
    const d = Math.min(Math.hypot(dx, dy), L.ua + L.fa + L.hand - 0.5);
    const a = Math.atan2(dy, dx), l2 = L.fa + L.hand;
    const c = Math.max(-1, Math.min(1, (L.ua * L.ua + d * d - l2 * l2) / (2 * L.ua * d)));
    const e = a + Math.acos(c);
    const E = { x: S.x + L.ua * Math.cos(e), y: S.y + L.ua * Math.sin(e) };
    const H = { x: S.x + d * Math.cos(a), y: S.y + d * Math.sin(a) };
    return { E, Wr: lerp(E, H, L.fa / l2), H };
  }

  // pose: { tl, tu, nk, hd, near:{th,sh,ft,toe}, far:{…}, arm:{ua,fa} | {reach:{x,dy}} (dy relative to shoulder),
  //         anchor:{ at:'near.ball'|'P', to:[x,y] } }
  function solve(ps) {
    let P = { x: 0, y: 0 };
    const M = add(P, ps.tl, L.tl), S = add(M, ps.tu, L.tu), N = add(S, ps.nk, L.nk);
    const Hc = add(N, ps.nk, L.hr), nose0 = add(Hc, ps.hd, L.hr), nose1 = add(Hc, ps.hd, L.hr + 5);
    const j = { P, M, S, N, Hc, nose0, nose1, near: leg(P, ps.near), far: leg(P, ps.far || ps.near) };
    const [k, sub] = ps.anchor.at.split('.');
    const src = sub ? j[k][sub] : j[k];
    const dx = ps.anchor.to[0] - src.x, dy = ps.anchor.to[1] - src.y;
    const shift = (o) => {
      for (const key in o) {
        const v = o[key];
        if (v && typeof v.x === 'number') o[key] = mv(v, dx, dy); else if (v && typeof v === 'object') shift(v);
      }
    };
    shift(j);
    if (ps.arm.reach) {
      const r = ik(j.S, { x: ps.arm.reach.x, y: j.S.y + ps.arm.reach.dy });
      j.E = r.E; j.Wr = r.Wr; j.Hn = r.H;
    } else {
      j.E = add(j.S, ps.arm.ua, L.ua); j.Wr = add(j.E, ps.arm.fa, L.fa); j.Hn = add(j.Wr, ps.arm.fa, L.hand);
    }
    return j;
  }

  const f = (n) => n.toFixed(1);
  const pts = (a) => a.map((p) => f(p.x) + ',' + f(p.y)).join(' ');
  const line = (a, role, extra = '') =>
    `<polyline points="${pts(a)}" fill="none" stroke="var(--fig-${role === 'far' ? 'body' : role})" stroke-width="${W[role === 'far' ? 'body' : role]}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"${role === 'far' ? ' opacity="0.4"' : ''}${extra}/>`;
  const dot = (p) => `<circle class="fig-dot" cx="${f(p.x)}" cy="${f(p.y)}" r="2.6" fill="var(--fig-body)"/>`;
  const circle = (c, r, role) =>
    `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${r}" fill="none" stroke="var(--fig-${role})" stroke-width="${W[role]}" vector-effect="non-scaling-stroke"/>`;
  const arrow = (a, role = 'accent') => line(a, role, ' marker-end="url(#fig-ah)"');
  const arc = (c, r, a0, a1, role = 'accent') => {
    const n = 12, p = [];
    for (let i = 0; i <= n; i++) p.push(add(c, a0 + ((a1 - a0) * i) / n, r));
    return arrow(p, role);
  };

  // hl: set of highlighted parts: neck, head, upper, lower, nearThigh, nearShank, nearFoot, arms
  function draw(j, hl = new Set(), opt = {}) {
    const R = (part) => (hl.has(part) ? 'accent' : 'body');
    let g = '';
    const fd = (p) => mv(p, opt.farDx || 0, 0);
    if (!opt.hideFar) g += line([j.far.mid, j.far.A, j.far.K, j.P].map(fd), 'far') + line([j.far.heel, j.far.ball, j.far.toe].map(fd), 'far');
    g += line([j.P, j.M], R('lower')) + line([j.M, j.S], R('upper')) + line([j.S, j.N], R('neck'));
    g += circle(j.Hc, L.hr, R('head')) + line([j.nose0, j.nose1], R('head'));
    g += line([j.P, j.near.K], R('nearThigh'));
    g += line([j.near.mid, j.near.A, j.near.K], R('nearShank'));
    g += line([j.near.heel, j.near.ball, j.near.toe], R('nearFoot'));
    g += line([j.S, j.E, j.Wr, j.Hn], R('arms'));
    g += [j.P, j.near.K, j.near.A, j.S, j.E].map(dot).join('');
    return g;
  }

  const defs = `<defs><marker id="fig-ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="var(--fig-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;

  root.PisadaRig = { L, W, dir, add, lerp, mv, solve, draw, line, dot, circle, arrow, arc, pts, defs, f };
  if (typeof module !== 'undefined') module.exports = root.PisadaRig;
})(typeof window !== 'undefined' ? window : globalThis);
