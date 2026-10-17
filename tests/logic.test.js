import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../js/logic.js";
import { PHASES } from "../js/program.js";

const ex = { id: "x", s: 3, lo: 6, hi: 10, rest: 120, inc: 2.5 };
const T = "2026-10-20";

test("no history gives a start hint", () => {
  assert.equal(L.suggest(ex, PHASES[3], [], T).kind, "start");
});
test("all sets at the top of the range adds load", () => {
  const s = L.suggest(ex, PHASES[3], [{ d: "2026-10-13", w: [60, 60, 60], r: [10, 10, 10] }], T);
  assert.equal(s.kind, "up");
  assert.equal(s.weight, 62.5);
});
test("inside the range holds load", () => {
  const s = L.suggest(ex, PHASES[3], [{ d: "2026-10-13", w: [60, 60, 60], r: [10, 9, 8] }], T);
  assert.equal(s.kind, "hold");
  assert.equal(s.weight, 60);
});
test("below the floor twice in a row drops 10%", () => {
  const h = [{ d: "2026-10-06", w: [60, 60, 60], r: [7, 5, 5] }, { d: "2026-10-13", w: [60, 60, 60], r: [6, 5, 4] }];
  const s = L.suggest(ex, PHASES[3], h, T);
  assert.equal(s.kind, "down");
  assert.equal(s.weight, 55);
});
test("today's entry does not change today's suggestion", () => {
  const h = [{ d: "2026-10-13", w: [60, 60, 60], r: [10, 9, 8] }, { d: T, w: [60], r: [10] }];
  assert.equal(L.suggest(ex, PHASES[3], h, T).kind, "hold");
});
test("assisted pull-up: less assistance is the next step", () => {
  const s = L.suggest(ex, PHASES[3], [{ d: "2026-10-13", w: [-20, -20, -20], r: [10, 10, 10] }], T);
  assert.equal(s.weight, -17.5);
});
test("deload halves sets", () => {
  assert.equal(L.setsFor(ex, PHASES[8]), 2);
  assert.equal(L.setsFor(ex, PHASES[3], true), 2);
});
test("week numbering wraps from 8 back to 3", () => {
  const start = "2026-10-19"; // Monday
  assert.equal(L.weekFor(start, "2026-10-19"), 1);
  assert.equal(L.weekFor(start, "2026-10-25"), 1);
  assert.equal(L.weekFor(start, "2026-10-26"), 2);
  assert.equal(L.weekFor(start, L.addDays(start, 7 * 7)), 8);
  assert.equal(L.weekFor(start, L.addDays(start, 8 * 7)), 3);
  assert.equal(L.weekFor(start, L.addDays(start, 14 * 7)), 3);
});
test("startForWeek puts today in the chosen week", () => {
  for (const n of [1, 4, 8]) assert.equal(L.weekFor(L.startForWeek(n, T), T), n);
});
test("three red check-in days trigger a set cut", () => {
  const red = { noMorning: true, poorSleep: true };
  const c = { "2026-10-18": red, "2026-10-19": red, "2026-10-20": red };
  assert.equal(L.needsCut(c, T), true);
  assert.equal(L.needsCut({ ...c, "2026-10-19": { noMorning: true } }, T), false);
});
test("every session fits in 90 minutes", async () => {
  const { DAYS } = await import("../js/program.js");
  for (let w = 1; w <= 8; w++) for (const d of DAYS) assert.ok(L.minutes(d, PHASES[w]) <= 90, `${d.title} week ${w}`);
});

test("calorie target for 77 kg, 183 cm, age 28 lands near 3,050", () => {
  const t = L.targets(77, 183, 28);
  assert.equal(t.kcal, 3050);
  assert.equal(t.p, 154);
  assert.equal(t.f, 77);
  assert.ok(Math.abs(t.p * 4 + t.c * 4 + t.f * 9 - t.kcal) < 10);
});
test("rice 150 g + 6-egg omelette needs a 3-hour wait", async () => {
  const { FOODS, portion } = await import("../js/foods.js");
  const rice = portion(FOODS.find((f) => f.id === "rice"), 150);
  const om = portion(FOODS.find((f) => f.id === "omelette"), 6);
  const meals = L.groupMeals([{ t: "12:00", ...rice }, { t: "12:05", ...om }]);
  assert.equal(meals.length, 1);
  assert.equal(L.digestWait(meals[0]), 180);
  assert.equal(L.digestWait({ kcal: 105, f: 0.4 }), 30);
});
test("entries far apart are separate meals", () => {
  const e = (t) => ({ t, kcal: 100, p: 1, c: 1, f: 1 });
  assert.equal(L.groupMeals([e("08:00"), e("08:30"), e("12:00")]).length, 2);
});

test("age from birth date rolls over on the birthday", () => {
  assert.equal(L.ageOn("2001-09-13", "2026-10-18"), 25);
  assert.equal(L.ageOn("2001-09-13", "2027-09-12"), 25);
  assert.equal(L.ageOn("2001-09-13", "2027-09-13"), 26);
});
test("target at 25 years old", () => {
  const t = L.targets(77, 183, 25);
  assert.equal(t.kcal, 3100);
  assert.equal(t.tdee, 2780);
});

test("Size mode adds 200 kcal over Lean", () => {
  assert.equal(L.targets(77, 183, 25, L.BULK.size.surplus).kcal - L.targets(77, 183, 25, L.BULK.lean.surplus).kcal, 200);
});
test("weight slope and ETA", () => {
  const e = []; for (let i = 0; i < 28; i += 2) e.push({ d: L.addDays("2026-10-01", i), kg: 77 + (i / 7) * 0.4 });
  const s = L.slopePerWeek(e, "2026-10-28");
  assert.ok(Math.abs(s - 0.4) < 0.01);
  assert.equal(L.etaWeeks(78.6, 85, 0.4), 16);
  assert.equal(L.etaWeeks(86, 85, s), 0);
  assert.equal(L.etaWeeks(78, 85, 0), null);
});
test("best lift by e1RM", () => {
  const b = L.bestLift([{ d: "a", w: [60, 70], r: [10, 3] }, { d: "b", w: [62.5], r: [9] }]);
  assert.equal(b.w, 62.5);
});
test("waist rate per 4 weeks and guard", () => {
  const m = [{ d: "2026-10-01", waist: 80 }, { d: "2026-10-29", waist: 82 }];
  const r = L.measureRate(m, "waist");
  assert.equal(r.per4w, 2);
  assert.equal(L.waistTooFast(r), true);
  assert.equal(L.measureRate([{ d: "2026-10-01", waist: 80 }, { d: "2026-10-10", waist: 81 }], "waist"), null);
});
test("sexual health summary", () => {
  const c = {}; for (let i = 0; i < 10; i++) c[L.addDays("2026-10-20", -i)] = { noMorning: i < 2 };
  assert.equal(L.sexHealth(c, "2026-10-20").status, "good");
  for (let i = 0; i < 10; i++) c[L.addDays("2026-10-20", -i)] = { noMorning: i < 6, lowLibido: i < 5 };
  assert.equal(L.sexHealth(c, "2026-10-20").status, "bad");
  assert.equal(L.sexHealth({}, "2026-10-20").status, null);
});
