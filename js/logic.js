// Pure training logic. No DOM, no storage, so it can be tested with plain Node.

const DAY_MS = 864e5;

export function isoDate(d = new Date()) {
  const t = new Date(d);
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  return t.toISOString().slice(0, 10);
}
export function addDays(iso, n) {
  return isoDate(new Date(Date.parse(iso + "T00:00:00") + n * DAY_MS));
}
function daysBetween(a, b) {
  return Math.round((Date.parse(b + "T00:00:00") - Date.parse(a + "T00:00:00")) / DAY_MS);
}
export function mondayOf(iso) {
  const dow = new Date(iso + "T00:00:00").getDay();
  return addDays(iso, -((dow + 6) % 7));
}

// Week 1–8 of the block. After week 8 the next block starts at week 3 (re-entry is a one-off).
export function weekFor(startDate, today) {
  const days = daysBetween(startDate, today);
  if (days < 0) return 1;
  const w = Math.floor(days / 7) + 1;
  return w <= 8 ? w : 3 + ((w - 9) % 6);
}
// Start date that makes `today` fall in week n, aligned to Monday.
export function startForWeek(n, today) {
  return addDays(mondayOf(today), -(n - 1) * 7);
}

export function setsFor(ex, phase, cutOne = false) {
  let n = phase.mod === "deload" ? Math.max(1, Math.ceil(ex.s / 2)) : ex.s;
  if (cutOne && !ex.time) n = Math.max(1, n - 1);
  return n;
}

// Rough session length: 10 min warm-up + per set (45 s work + rest) + 1 min setup per exercise.
export function minutes(day, phase, cutOne = false) {
  if (!day.ex.length) return 0;
  let s = 10 * 60;
  for (const ex of day.ex) {
    if (ex.time) { s += ex.hi * 60; continue; }
    s += setsFor(ex, phase, cutOne) * (45 + ex.rest) + 60;
  }
  return Math.round(s / 60);
}

const roundTo = (x, step) => (step ? Math.round(x / step) * step : x);
const kg = (v) => Math.round(v * 100) / 100 + " kg";

// Double progression. `history` is the exercise's log; entries dated `today` are ignored
// so the suggestion stays stable while today's sets are being typed in.
export function suggest(ex, phase, history = [], today = isoDate()) {
  const past = history.filter((h) => h.d < today);
  const last = past[past.length - 1];
  const prev = past[past.length - 2];
  if (!last) {
    return { kind: "start", tag: "เริ่ม", weight: null,
      text: ex.start || `ยังไม่มีบันทึก เลือกน้ำหนักที่ทำได้ราว ${ex.lo + 1} ครั้ง แบบเหลือแรง ${phase.rir} ครั้ง` };
  }
  const w = Math.max(...last.w.map(Number));
  const reps = last.r.map(Number);
  if (phase.mod === "deload") {
    return { kind: "deload", tag: "deload", weight: w, text: `ใช้ ${kg(w)} × ${ex.lo} ครั้ง เซ็ตน้อยลงครึ่งหนึ่ง เบาสบาย` };
  }
  const below = (r) => r.some((x) => x < ex.lo);
  if (below(reps) && prev && below(prev.r.map(Number))) {
    const nw = roundTo(w * 0.9, ex.inc || 0.5);
    return { kind: "down", tag: "ลด", weight: nw, text: `ต่ำกว่า ${ex.lo} ครั้งสองรอบติด ลดเป็น ${kg(nw)} แล้วไต่ใหม่` };
  }
  if (reps.length >= 1 && reps.every((x) => x >= ex.hi)) {
    if (!ex.inc) return { kind: "up", tag: "เพิ่ม", weight: w, text: "แตะเพดานแล้ว เพิ่มความยาก (ช้าลง/ค้างนานขึ้น) หรือเพิ่มน้ำหนักถ่วง" };
    const nw = Math.round((w + ex.inc) * 100) / 100;
    return { kind: "up", tag: "เพิ่ม", weight: nw, text: `แตะ ${ex.hi} ครบทุกเซ็ต ขึ้นเป็น ${kg(nw)} เป้า ${ex.lo}+ ครั้ง` };
  }
  const total = reps.reduce((a, b) => a + b, 0);
  return { kind: "hold", tag: "คงไว้", weight: w, text: `ใช้ ${kg(w)} ต่อ เป้ารวมเกิน ${total} ครั้ง (เพิ่มอย่างน้อย 1 ครั้ง)` };
}

// Best estimated 1RM (Epley) per session, for the trend line.
export function e1rm(entry) {
  let best = 0;
  entry.w.forEach((w, i) => {
    const r = Number(entry.r[i]);
    if (w > 0 && r > 0) best = Math.max(best, w * (1 + r / 30));
  });
  return Math.round(best * 10) / 10;
}

// Readiness: a day is "red" when 2+ warning signs are ticked.
export const SIGNS = [
  { k: "noMorning", t: "ตื่นเช้าไม่มีอาการแข็งตัว" },
  { k: "lowLibido", t: "ความต้องการทางเพศลดลงชัด" },
  { k: "poorSleep", t: "นอนไม่ถึง 7 ชม. หรือหลับไม่สนิท" },
  { k: "highRhr", t: "ชีพจรตอนตื่นสูงกว่าปกติ 5+ ครั้ง/นาที" },
  { k: "sore", t: "ยังปวดกล้ามจากครั้งก่อนจนเล่นท่าเดิมไม่ไหว" },
];
export function redDay(c) {
  return !!c && SIGNS.filter((s) => c[s.k]).length >= 2;
}
// Three red days in a row ending today (or yesterday, if today has no check-in yet).
export function needsCut(checkins, today) {
  let end = checkins[today] ? today : addDays(today, -1);
  for (let i = 0; i < 3; i++) if (!redDay(checkins[addDays(end, -i)])) return false;
  return true;
}

// Body weight: 7-day average ending at `today`, and change versus the 7 days before.
export function bodyTrend(entries, today, range = [0.2, 0.35]) {
  const avg = (from, to) => {
    const xs = entries.filter((e) => e.d > from && e.d <= to).map((e) => e.kg);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const cur = avg(addDays(today, -7), today);
  const before = avg(addDays(today, -14), addDays(today, -7));
  const delta = cur != null && before != null ? cur - before : null;
  let verdict = null;
  if (delta != null) verdict = delta < range[0] ? "slow" : delta > range[1] ? "fast" : "ok";
  return { cur, before, delta, verdict };
}

/* ---------------- nutrition ---------------- */

// Mifflin-St Jeor BMR (male).
export function bmr(kg, cm, age) {
  return 10 * kg + 6.25 * cm - 5 * age + 5;
}

// Daily targets for a lean bulk on this 6-day program:
// activity factor 1.55, +300 kcal surplus, protein 2.0 g/kg, fat 1.0 g/kg, carbs fill the rest.
export const ACTIVITY = 1.55;
export const SURPLUS = 300;
export function targets(kg, cm, age, surplus = SURPLUS) {
  const tdee = Math.round(bmr(kg, cm, age) * ACTIVITY);
  const kcal = Math.round((tdee + surplus) / 50) * 50;
  const p = Math.round(kg * 2.0);
  const f = Math.round(kg * 1.0);
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  // Floors: protein gains flatten past ~1.6 g/kg; fat below ~0.8 g/kg for days at a time drags testosterone.
  return { tdee, kcal, p, c, f, pMin: Math.round(kg * 1.6), fMin: Math.round(kg * 0.8) };
}

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const fromMin = (x) => {
  const m = ((Math.round(x) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};

// Entries eaten within 45 minutes of each other count as one meal.
export function groupMeals(entries) {
  const sorted = entries.slice().sort((a, b) => toMin(a.t) - toMin(b.t));
  const meals = [];
  for (const e of sorted) {
    const last = meals[meals.length - 1];
    if (last && toMin(e.t) - last.end <= 45) { last.items.push(e); last.end = toMin(e.t); }
    else meals.push({ start: toMin(e.t), end: toMin(e.t), items: [e] });
  }
  return meals.map((m) => {
    const sum = (k) => Math.round(m.items.reduce((a, e) => a + e[k], 0) * 10) / 10;
    return { t: fromMin(m.start), start: m.start, items: m.items, kcal: Math.round(sum("kcal")), p: sum("p"), c: sum("c"), f: sum("f") };
  });
}

// Minutes to wait after a meal before hard lifting. Big or fatty meals empty from the stomach slowly.
export function digestWait(meal) {
  if (meal.kcal >= 700 || meal.f >= 25) return 180;
  if (meal.kcal >= 400 || meal.f >= 15) return 120;
  if (meal.kcal >= 150) return 60;
  return 30;
}

export function dayTotals(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const e of entries) for (const k in t) t[k] += e[k];
  for (const k in t) t[k] = Math.round(t[k] * 10) / 10;
  t.kcal = Math.round(t.kcal);
  return t;
}

// Consecutive logged days before `today` whose total `key` fell under `floor`.
// A day with nothing logged ends the streak, since an unlogged day says nothing.
export function lowStreak(food, today, key, floor) {
  let n = 0;
  for (let d = addDays(today, -1); (food[d] || []).length; d = addDays(d, -1)) {
    if (dayTotals(food[d])[key] >= floor) break;
    n++;
  }
  return n;
}

// Whole years between a birth date and `today` (both ISO dates).
export function ageOn(dob, today) {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/* ---------------- goals ---------------- */

// Bulk modes. Size gains faster but adds more fat, and body fat that climbs too fast
// lowers testosterone, so Size comes with guard rails (waist + sexual-health check-ins).
export const BULK = {
  lean: { name: "Lean", surplus: 300, range: [0.2, 0.35] },
  size: { name: "Size", surplus: 500, range: [0.35, 0.5] },
};

// Least-squares body-weight slope in kg/week over the last `days` days.
export function slopePerWeek(entries, today, days = 28) {
  const from = addDays(today, -days);
  const pts = entries.filter((e) => e.d > from && e.d <= today).map((e) => [daysBetween(from, e.d), e.kg]);
  if (pts.length < 4 || pts[pts.length - 1][0] - pts[0][0] < 10) return null;
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  const num = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
  const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  return den ? (num / den) * 7 : null;
}

// Weeks until `goal` at the current rate; 0 if reached, null if not gaining.
export function etaWeeks(cur, goal, slope) {
  if (cur >= goal) return 0;
  if (slope == null || slope < 0.03) return null;
  return Math.ceil((goal - cur) / slope - 1e-9);
}

// Best set by estimated 1RM across an exercise's history.
export function bestLift(history = []) {
  let best = null;
  for (const e of history) e.w.forEach((w, i) => {
    const r = Number(e.r[i]);
    if (w > 0 && r > 0) {
      const v = w * (1 + r / 30);
      if (!best || v > best.e1rm) best = { e1rm: Math.round(v * 10) / 10, w, r, d: e.d };
    }
  });
  return best;
}
export const goalE1rm = (w, reps = 8) => Math.round(w * (1 + reps / 30) * 10) / 10;

// Change in one tape measurement, scaled to cm per 4 weeks, comparing the latest entry with
// one at least 21 days older.
export function measureRate(measures, key) {
  const xs = measures.filter((m) => m[key] > 0).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (xs.length < 2) return null;
  const last = xs[xs.length - 1];
  const older = xs.filter((m) => daysBetween(m.d, last.d) >= 21);
  if (!older.length) return null;
  const ref = older[older.length - 1];
  const days = daysBetween(ref.d, last.d);
  return { delta: Math.round((last[key] - ref[key]) * 10) / 10, days, per4w: Math.round(((last[key] - ref[key]) / days) * 28 * 10) / 10 };
}
// Waist growing more than 1.5 cm per 4 weeks means the surplus is mostly going to fat.
export const waistTooFast = (m) => !!m && m.per4w > 1.5;

// Sexual-health summary of the last `n` days of check-ins.
export function sexHealth(checkins, today, n = 14) {
  let logged = 0, noMorning = 0, lowLibido = 0;
  for (let i = 0; i < n; i++) {
    const c = checkins[addDays(today, -i)];
    if (!c) continue;
    logged++;
    if (c.noMorning) noMorning++;
    if (c.lowLibido) lowLibido++;
  }
  if (logged < 5) return { logged, noMorning, lowLibido, status: null };
  const morningRate = (logged - noMorning) / logged;
  const status = morningRate >= 0.7 && lowLibido <= 2 ? "good" : morningRate >= 0.5 && lowLibido <= 4 ? "watch" : "bad";
  return { logged, noMorning, lowLibido, morningRate, status };
}
