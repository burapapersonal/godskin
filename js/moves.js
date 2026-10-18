// Stick-figure animations of each exercise's path. A pattern is two poses (A = start/stretch,
// B = end of the lift) plus props; the figure is solved with two-bone IK so hands and feet land
// where the pose puts them. World units: y up, ground at y = 10, figure about 180 tall.
// Side view faces right. Front view (front: true) mirrors the arms for raises and chops.

const L = { torso: 52, neck: 13, head: 9, upper: 28, fore: 27, thigh: 42, shin: 41, foot: 14 };
const rad = (d) => (d * Math.PI) / 180;
const at = (p, len, deg) => [p[0] + len * Math.cos(rad(deg)), p[1] + len * Math.sin(rad(deg))];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

// Joint between root and target for limb lengths a, b; s = +1 bends counterclockwise.
function ik(root, target, a, b, s) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const d = Math.min(Math.hypot(dx, dy), a + b - 0.01);
  const base = Math.atan2(dy, dx);
  const off = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const j = [root[0] + a * Math.cos(base + s * off), root[1] + a * Math.sin(base + s * off)];
  // out of reach: the limb goes straight toward the target
  return [j, [root[0] + d * Math.cos(base), root[1] + d * Math.sin(base)]];
}

// Standing defaults; patterns override what changes.
const STAND = { hip: [118, 93], torso: 90, foot: [122, 10], hand: [4, -52] };

// grip: what the hand holds. cable: pulley point the cable runs to the hand from.
export const MOVES = {
  press_incline: {
    base: { hip: [140, 62], torso: 145, foot: [192, 10], eb: -1 },
    A: { hand: [8, 12] }, B: { hand: [22, 50] },
    props: [["line", 152, 54, 88, 98], ["line", 125, 54, 168, 54], ["line", 150, 54, 150, 10], ["line", 100, 90, 100, 10]],
  },
  press_flat: {
    base: { hip: [150, 60], torso: 180, foot: [196, 10], eb: -1 },
    A: { hand: [6, 14] }, B: { hand: [2, 50] },
    props: [["line", 80, 52, 168, 52], ["line", 95, 52, 95, 10], ["line", 155, 52, 155, 10]],
  },
  press_shoulder: {
    base: { hip: [108, 52], torso: 96, foot: [160, 10], eb: -1 },
    A: { hand: [9, 6] }, B: { hand: [5, 53] },
    props: [["line", 94, 44, 88, 128], ["line", 92, 44, 132, 44], ["line", 112, 44, 112, 10]],
  },
  row_prone: {
    base: { hip: [95, 70], torso: 35, foot: [62, 10], eb: -1 },
    A: { hand: [0, -48] }, B: { hand: [-20, -22] },
    props: [["line", 100, 58, 152, 94], ["line", 112, 66, 112, 10], ["line", 145, 89, 145, 10]],
  },
  row_bent: {
    base: { hip: [92, 84], torso: 14, foot: [96, 10], eb: -1 },
    A: { hand: [0, -46] }, B: { hand: [-28, -6] },
    props: [["line", 150, 50, 210, 50], ["line", 160, 50, 160, 10], ["line", 200, 50, 200, 10]],
  },
  row_seated: {
    base: { hip: [92, 40], foot: [168, 30], eb: -1 },
    A: { torso: 70, hand: [48, -4] }, B: { torso: 95, hand: [6, -30] },
    cable: [214, 48], props: [["line", 70, 32, 120, 32], ["line", 172, 20, 172, 46]],
  },
  row_high: {
    base: { hip: [92, 40], foot: [168, 30], eb: -1 },
    A: { torso: 72, hand: [48, 2] }, B: { torso: 95, hand: [4, -2] },
    cable: [214, 80], props: [["line", 70, 32, 120, 32], ["line", 172, 20, 172, 46]],
  },
  face_pull: {
    base: { ...STAND, torso: 92, eb: 1 },
    A: { hand: [48, 6] }, B: { hand: [8, 18] },
    cable: [222, 160],
  },
  pulldown: {
    base: { hip: [110, 52], torso: 100, foot: [156, 10], eb: -1 },
    A: { hand: [10, 54] }, B: { hand: [12, 4] },
    cable: [112, 205], props: [["line", 96, 44, 136, 44], ["line", 140, 66, 160, 66]],
  },
  straight_arm: {
    base: { ...STAND, torso: 76, eb: 1 },
    A: { hand: [42, 28] }, B: { hand: [10, -50] },
    cable: [222, 190],
  },
  pullover: {
    base: { hip: [150, 60], torso: 180, foot: [196, 10], eb: 1 },
    A: { hand: [-48, 12] }, B: { hand: [4, 50] },
    props: [["line", 80, 52, 168, 52], ["line", 95, 52, 95, 10], ["line", 155, 52, 155, 10]],
  },
  fly_high: {
    base: { ...STAND, torso: 84, eb: 1 },
    A: { hand: [-14, 30] }, B: { hand: [30, -34] },
    cable: [50, 195],
  },
  fly_low: {
    base: { ...STAND, torso: 86, eb: 1 },
    A: { hand: [-16, -40] }, B: { hand: [32, 20] },
    cable: [50, 14],
  },
  squat: {
    base: { foot: [126, 10], hand: [-2, 4], eb: -1 },
    A: { hip: [120, 93], torso: 90 }, B: { hip: [98, 50], torso: 58 },
    grip: "bar", rail: 112,
  },
  squat_upright: {
    base: { foot: [128, 10], hand: [12, -8], eb: -1 },
    A: { hip: [122, 93], torso: 90 }, B: { hip: [106, 46], torso: 76 },
    props: [["line", 112, 14, 132, 14]],
  },
  split: {
    base: { foot: [152, 10], foot2: [78, 10], torso: 90, hand: [0, -50] },
    A: { hip: [116, 84] }, B: { hip: [112, 48] },
  },
  split_bench: {
    base: { foot: [154, 10], foot2: [64, 40], torso: 86, hand: [0, -50] },
    A: { hip: [118, 86] }, B: { hip: [112, 50] },
    props: [["line", 40, 40, 80, 40], ["line", 60, 40, 60, 10]],
  },
  hinge: {
    base: { foot: [122, 10], hand: [0, -52] },
    A: { hip: [118, 92], torso: 90 }, B: { hip: [96, 86], torso: 16 },
  },
  leg_ext: {
    base: { hip: [100, 56], torso: 96, hand: [6, -40] },
    A: { foot: [142, 16] }, B: { foot: [182, 58] },
    props: [["line", 84, 48, 140, 48], ["line", 90, 48, 86, 120], ["line", 110, 48, 110, 10]],
  },
  leg_curl: {
    base: { hip: [100, 56], torso: 96, hand: [6, -40] },
    A: { foot: [182, 56] }, B: { foot: [134, 22] },
    props: [["line", 84, 48, 140, 48], ["line", 90, 48, 86, 120], ["line", 110, 48, 110, 10]],
  },
  leg_curl_stand: {
    base: { ...STAND, hand: [30, -20], kb: 1 },
    A: { foot: [122, 10] }, B: { foot: [84, 44] },
    foot2: [132, 10], cable: [214, 14],
  },
  calf: {
    base: { ...STAND, hand: [0, -50] },
    A: { heel: 0 }, B: { heel: 1 },
    props: [["line", 108, 10, 150, 10]],
  },
  calf_seated: {
    base: { hip: [100, 52], torso: 92, foot: [146, 10], hand: [44, -24] },
    A: { heel: 0 }, B: { heel: 1 },
    props: [["line", 80, 44, 130, 44], ["line", 100, 44, 100, 10]],
  },
  crunch_kneel: {
    base: { hip: [122, 60], foot: [80, 12], hand: [6, 8], eb: 1 },
    A: { torso: 96 }, B: { torso: 38 },
    cable: [128, 205],
  },
  crunch_stand: {
    base: { ...STAND, hand: [6, 8], eb: 1 },
    A: { torso: 94 }, B: { torso: 52 },
    cable: [70, 205],
  },
  knee_raise: {
    base: { hip: [120, 110], torso: 90, hand: [4, 50] },
    A: { foot: [124, 28] }, B: { foot: [152, 104] },
    grip: "bar",
  },
  curl: {
    base: { ...STAND, eb: -1 },
    A: { hand: [2, -52] }, B: { hand: [18, -12] },
  },
  curl_incline: {
    base: { hip: [112, 52], torso: 118, foot: [162, 10], eb: -1 },
    A: { hand: [-8, -52] }, B: { hand: [10, -16] },
    props: [["line", 102, 44, 70, 104], ["line", 96, 44, 132, 44], ["line", 112, 44, 112, 10]],
  },
  curl_behind: {
    base: { ...STAND, torso: 86, eb: -1 },
    A: { hand: [-26, -44] }, B: { hand: [8, -14] },
    cable: [64, 16],
  },
  pushdown: {
    base: { ...STAND, torso: 86, eb: -1 },
    A: { hand: [16, -16] }, B: { hand: [6, -52] },
    cable: [150, 200], grip: "rope",
  },
  overhead_tri: {
    base: { ...STAND, torso: 84, eb: -1 },
    A: { hand: [-14, 18] }, B: { hand: [8, 54] },
    cable: [40, 150], grip: "rope",
  },
  lat_raise: {
    front: true, base: { torso: 90, eb: 1 },
    A: { hand: [8, -50] }, B: { hand: [52, 2] },
  },
  y_raise: {
    front: true, base: { torso: 90, eb: 1 },
    A: { hand: [6, -50] }, B: { hand: [36, 40] },
  },
  side_bend: {
    front: true, base: { hand: [0, -52], handL: [0, -46], grip: "db1" },
    A: { torso: 90 }, B: { torso: 74 },
  },
  hold: {
    front: true, base: { torso: 90, hand: [0, -52], handL: [0, -46], grip: "db1" },
    A: { hipY: 93 }, B: { hipY: 91 },
  },
  chop_high: {
    front: true, base: { eb: 1 },
    A: { torso: 98, handAbs: [182, 172] }, B: { torso: 84, handAbs: [80, 70] },
    cable: [220, 196],
  },
  chop_low: {
    front: true, base: { eb: 1 },
    A: { torso: 98, handAbs: [182, 50] }, B: { torso: 84, handAbs: [84, 170] },
    cable: [220, 14],
  },
  pallof: {
    base: { ...STAND, eb: -1 },
    A: { hand: [12, -8] }, B: { hand: [50, -6] },
  },
};

// Exercise id -> [pattern, grip]. Grip: db, bar, handle, rope; omitted = pattern default.
export const MOVE_OF = {
  incl_mach: ["press_incline", "handle"], smith_incline: ["press_incline", "bar"], incl_db: ["press_incline", "db"], incl_db_fly: ["press_incline", "db"],
  flat_mach: ["press_flat", "handle"], flat_db: ["press_flat", "db"], smith_flat: ["press_flat", "bar"],
  mach_ohp: ["press_shoulder", "handle"], db_ohp: ["press_shoulder", "db"], smith_ohp: ["press_shoulder", "bar"],
  cs_db_row: ["row_prone", "db"], cs_db_row_wide: ["row_prone", "db"], rear_db: ["lat_raise", "db"],
  one_arm_db_row: ["row_bent", "db"],
  cable_row_close: ["row_seated", "handle"], wide_row: ["row_high", "bar"], face_pull: ["face_pull", "rope"],
  lat_pd: ["pulldown", "bar"], one_arm_lat: ["pulldown", "handle"], cable_lat_pd: ["pulldown", "bar"],
  str_arm: ["straight_arm", "bar"], db_pullover: ["pullover", "db"],
  cable_fly_hl: ["fly_high", "handle"], cable_cross_hl: ["fly_high", "handle"],
  cable_fly_lh: ["fly_low", "handle"], cable_cross_lh: ["fly_low", "handle"],
  smith_squat: ["squat", "bar"], smith_heel_squat: ["squat_upright", "bar"], goblet_heel: ["squat_upright", "db"],
  smith_split: ["split", "db"], walking_lunge: ["split", "db"], ffe_split: ["split", "db"], bss: ["split_bench", "db"],
  rdl: ["hinge", "db"], smith_rdl: ["hinge", "bar"], sl_rdl: ["hinge", "db"],
  leg_ext: ["leg_ext"], cable_leg_ext: ["leg_ext"], leg_curl_s: ["leg_curl"], leg_curl_l: ["leg_curl"], cable_leg_curl: ["leg_curl_stand"],
  smith_calf: ["calf", "bar"], sl_calf: ["calf", "db"], seated_calf: ["calf_seated", "db"],
  cable_crunch: ["crunch_kneel", "rope"], ss_core: ["crunch_kneel", "rope"], stand_crunch: ["crunch_stand", "rope"],
  hanging_knee_raise: ["knee_raise"], ss_core_hang: ["knee_raise"],
  incl_curl: ["curl_incline", "db"], db_curl: ["curl", "db"], bayes_curl: ["curl_behind", "handle"],
  ss_hammer_pd: ["curl", "db"], rope_hammer_pd: ["curl", "rope"], ss_dbcurl_pd: ["curl", "db"], ss_curl_pd: ["curl_behind", "handle"],
  oh_tri: ["overhead_tri", "rope"], db_oh_tri: ["overhead_tri", "db"], cross_tri: ["pushdown", "handle"],
  lat_raise_c: ["lat_raise", "handle"], lat_raise_db: ["lat_raise", "db"], cable_rear_delt: ["lat_raise", "handle"], cable_y_raise: ["y_raise", "handle"],
  cable_chop: ["chop_high", "handle"], chop_lh: ["chop_low", "handle"],
  pallof: ["pallof", "handle"], pallof_kneel: ["pallof", "handle"],
  suitcase_hold: ["hold"], side_bend: ["side_bend"],
};

const lerp = (a, b, t) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * t) : a + (b - a) * t);
function pose(m, t) {
  const A = { ...m.base, ...m.A }, B = { ...m.base, ...m.B }, out = {};
  for (const k of Object.keys(A)) out[k] = typeof A[k] === "number" || Array.isArray(A[k]) ? lerp(A[k], B[k], t) : A[k];
  return out;
}

// Line segments for one frame: [[x1,y1,x2,y2,cls], ...] plus circles [[x,y,r,cls]].
export function frame(m, t, grip) {
  const p = pose(m, t), segs = [], dots = [];
  const seg = (a, b, cls = "b") => segs.push([a[0], a[1], b[0], b[1], cls]);
  const hold = (h, g) => {
    if (g === "db" || g === "db1") { seg([h[0] - 7, h[1]], [h[0] + 7, h[1]], "w"); dots.push([h[0] - 7, h[1], 3.5, "w"], [h[0] + 7, h[1], 3.5, "w"]); }
    else if (g === "bar") seg([h[0] - 16, h[1]], [h[0] + 16, h[1]], "w");
    else if (g === "rope") { seg(h, [h[0] - 4, h[1] - 8], "w"); seg(h, [h[0] + 4, h[1] - 8], "w"); }
    else if (g === "handle") dots.push([h[0], h[1], 3.5, "w"]);
  };
  const g = grip || m.grip || p.grip;
  if (m.front) {
    const hip = [120, p.hipY ?? 93];
    const sh = at(hip, L.torso, p.torso), nx = Math.sin(rad(p.torso)), ny = -Math.cos(rad(p.torso));
    seg(hip, sh);
    const head = at(sh, L.neck, p.torso);
    dots.push([head[0], head[1], L.head, "h"]);
    for (const side of [1, -1]) {
      const s = [sh[0] + side * 20 * nx, sh[1] + side * 20 * ny];
      const hp = [hip[0] + side * 9, hip[1]];
      seg([sh[0], sh[1]], s); seg([hip[0], hip[1]], hp);
      const [knee, ankle] = ik(hp, [hip[0] + side * 13, 10], L.thigh, L.shin, side);
      seg(hp, knee); seg(knee, ankle);
      const rel = side === 1 ? p.hand : p.handL || p.hand;
      const target = p.handAbs || add(s, [side * rel[0], rel[1]]);
      const [el, h] = ik(s, target, L.upper, L.fore, side * (p.eb ?? 1));
      seg(s, el); seg(el, h);
      if (g !== "db1" || side === 1) hold(h, g === "db1" ? "db" : g);
      if (m.cable && side === 1) seg(m.cable, h, "c");
    }
    return { segs, dots };
  }
  const lift = (p.heel || 0) * 9;
  const hip = [p.hip[0], p.hip[1] + lift];
  const sh = at(hip, L.torso, p.torso);
  seg(hip, sh);
  const head = at(sh, L.neck, p.torso);
  dots.push([head[0], head[1], L.head, "h"]);
  const legs = [[p.foot, p.kb ?? 1, "b"]];
  if (p.foot2 || m.foot2) legs.unshift([p.foot2 || m.foot2, p.kb2 ?? 1, "f"]);
  for (const [f, kb, cls] of legs) {
    const ankle = [f[0], f[1] + (cls === "b" ? lift : 0)];
    const [knee, a] = ik(hip, ankle, L.thigh, L.shin, kb);
    seg(hip, knee, cls); seg(knee, a, cls);
    seg(a, [f[0] + L.foot, f[1]], cls);
  }
  const [el, h] = ik(sh, add(sh, p.hand), L.upper, L.fore, p.eb ?? -1);
  seg(sh, el); seg(el, h);
  hold(h, g);
  if (m.cable) seg(m.cable, h, "c");
  if (m.rail != null) { seg([m.rail + 20, 10], [m.rail + 20, 200], "p"); seg([m.rail - 30, 10], [m.rail - 30, 200], "p"); }
  return { segs, dots };
}

const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
// Lift in 1.0 s, hold 0.3 s, lower in 1.6 s, rest 0.4 s: the slow eccentric the notes ask for.
export function phaseAt(ms) {
  const c = ms % 3300;
  if (c < 1000) return ease(c / 1000);
  if (c < 1300) return 1;
  if (c < 2900) return 1 - ease((c - 1300) / 1600);
  return 0;
}

const NS = "http://www.w3.org/2000/svg";
const Y = (y) => 210 - y;
// Draws the pattern into `svg` and animates it until the svg leaves the page or is hidden.
export function mountMove(svg, id) {
  const [name, grip] = MOVE_OF[id] || [];
  const m = MOVES[name];
  if (!m) return false;
  svg.setAttribute("viewBox", "20 0 220 210");
  svg.innerHTML = `<line class="mv-g" x1="0" y1="${Y(10)}" x2="260" y2="${Y(10)}"/>` +
    (m.props || []).map(([, x1, y1, x2, y2]) => `<line class="mv-p" x1="${x1}" y1="${Y(y1)}" x2="${x2}" y2="${Y(y2)}"/>`).join("") +
    `<g class="mv-ghost"></g><g class="mv-fig"></g>`;
  const draw = (g, t) => {
    const { segs, dots } = frame(m, t, grip);
    g.innerHTML = segs.map(([x1, y1, x2, y2, c]) => `<line class="mv-${c}" x1="${x1.toFixed(1)}" y1="${Y(y1).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${Y(y2).toFixed(1)}"/>`).join("") +
      dots.map(([x, y, r, c]) => `<circle class="mv-${c}" cx="${x.toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${r}"/>`).join("");
  };
  const fig = svg.querySelector(".mv-fig");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    draw(svg.querySelector(".mv-ghost"), 0);
    draw(fig, 1);
    return true;
  }
  draw(svg.querySelector(".mv-ghost"), 0);
  const t0 = performance.now();
  const tick = (now) => {
    if (!svg.isConnected || svg.closest("[hidden]")) return;
    draw(fig, phaseAt(now - t0));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
}
