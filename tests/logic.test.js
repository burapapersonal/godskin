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
