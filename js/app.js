import { PHASES, DAYS } from "./program.js";
import * as L from "./logic.js";
import * as S from "./store.js";
import { FOODS, foodById, portion } from "./foods.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtDate = (d) => { const [, m, dd] = d.split("-"); return `${+dd}/${+m}`; };

const state = {
  logs: {},       // exId -> { history: [{ d, w:[], r:[], wk }] }
  settings: {},   // { startDate, lastExport }
  body: [],       // [{ d, kg }]
  checkins: {},   // date -> { noMorning, lowLibido, ... }
  food: {},       // date -> [{ id, t:"HH:MM", n, qty, unit, kcal, p, c, f }]
  tab: "train",
  dayIdx: 0,
};
const today = () => L.isoDate();
const week = () => L.weekFor(state.settings.startDate, today());
const phase = () => PHASES[week()];
const cutOne = () => L.needsCut(state.checkins, today());

/* ---------------- boot ---------------- */
async function boot() {
  state.logs = await S.get("logs", {});
  state.settings = await S.get("settings", {});
  state.body = await S.get("body", []);
  state.checkins = await S.get("checkins", {});
  state.food = await S.get("food", {});
  if (!state.settings.startDate) {
    state.settings.startDate = L.startForWeek(1, today());
    await S.set("settings", state.settings);
  }
  const dow = new Date().getDay();
  state.dayIdx = Math.max(0, DAYS.findIndex((d) => d.dow === dow));
  const hash = location.hash.slice(1);
  if (["train", "food", "body", "check", "rules", "data"].includes(hash)) state.tab = hash;

  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    state.tab = b.dataset.tab;
    history.replaceState(null, "", "#" + state.tab);
    renderTabs();
  }));
  S.persist();
  renderAll();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

function renderAll() {
  $("today").textContent = new Date().toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
  renderWeeks();
  renderTabs();
}
function renderTabs() {
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === state.tab));
  document.querySelectorAll("[data-page]").forEach((p) => (p.hidden = p.dataset.page !== state.tab));
  ({ train: renderTrain, food: renderFood, body: renderBody, check: renderCheck, data: renderData, rules: () => {} })[state.tab]();
}

/* ---------------- week strip ---------------- */
function renderWeeks() {
  const el = $("weeks");
  el.innerHTML = "";
  const cur = week();
  for (let i = 1; i <= 8; i++) {
    const b = document.createElement("button");
    b.id = "wk" + i;
    b.textContent = i;
    b.title = `ตั้งให้สัปดาห์นี้เป็นสัปดาห์ ${i}`;
    b.setAttribute("aria-pressed", i === cur);
    b.onclick = async () => {
      state.settings.startDate = L.startForWeek(i, today());
      await S.set("settings", state.settings);
      renderAll();
    };
    el.appendChild(b);
  }
  $("phaseName").textContent = phase().name;
  $("phaseDesc").textContent = phase().desc;
}

/* ---------------- train ---------------- */
function renderTrain() {
  renderBanners();
  renderDays();
  renderDay();
}
function renderBanners() {
  let html = "";
  if (cutOne()) html += `<div class="banner bad"><b>ฟื้นตัวไม่ทัน 3 วันติด</b> แอปตัดเซ็ตทุกท่าลง 1 เซ็ตแล้ว เพิ่มอาหาร ~300 kcal และนอนให้มากขึ้น</div>`;
  const last = state.settings.lastExport;
  const hasData = Object.keys(state.logs).length > 0;
  if (hasData && (!last || Date.now() - Date.parse(last) > 7 * 864e5)) {
    html += `<div class="banner"><b>ยังไม่ได้สำรองข้อมูลเกิน 7 วัน</b> ข้อมูลอยู่ในเครื่องนี้เท่านั้น ไปที่แท็บสำรองข้อมูลเพื่อ Export ไฟล์เก็บไว้</div>`;
  }
  $("banners").innerHTML = html;
}
function renderDays() {
  const el = $("days");
  el.innerHTML = "";
  const dow = new Date().getDay();
  DAYS.forEach((d, i) => {
    const b = document.createElement("button");
    b.className = "day" + (d.dow === dow ? " today" : "");
    b.id = "day" + i;
    b.setAttribute("aria-pressed", i === state.dayIdx);
    b.style.setProperty("--pc", `var(${d.pc})`);
    b.innerHTML = `<span class="plate">${d.code}</span><span class="dn">${d.th}</span><small>${esc(d.title)}</small>`;
    b.onclick = () => { state.dayIdx = i; renderDays(); renderDay(); };
    el.appendChild(b);
  });
}

function hist(id) { return state.logs[id]?.history || []; }
function todayEntry(id) { return hist(id).find((h) => h.d === today()); }

function sparkline(history) {
  const pts = history.slice(-12).map(L.e1rm).filter((v) => v > 0);
  if (pts.length < 2) return "";
  const W = 180, H = 40, pad = 4;
  const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const xy = pts.map((v, i) => [pad + (i * (W - 2 * pad)) / (pts.length - 1), H - pad - ((v - min) / span) * (H - 2 * pad)]);
  const line = xy.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const [ex, ey] = xy[xy.length - 1];
  return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="แนวโน้ม 1RM ประมาณ จาก ${min} ถึง ${pts[pts.length - 1]} kg">
    <polyline class="ln" pathLength="1" points="${line}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="end" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.5" fill="currentColor"/></svg>
    <span class="mono">e1RM ${pts[0]} → ${pts[pts.length - 1]} kg</span>`;
}

function renderDay() {
  const d = DAYS[state.dayIdx], p = phase(), cut = cutOne(), v = $("dayView");
  const mins = L.minutes(d, p, cut);
  let html = `<div class="dayhead"><div><div class="label">${d.th} · ${esc(p.name)}</div><h2>${esc(d.title)}</h2><div class="sub">${esc(d.sub)}</div></div>` +
    (mins ? `<span class="chip${mins > 90 ? " over" : ""}">≈ ${mins} นาที รวมวอร์ม</span>` : "") + `</div>`;
  if (!d.ex.length) { v.innerHTML = html + `<div class="ex"><p>${esc(d.rest)}</p></div>`; return; }

  html += `<div class="dayprog" id="dayprog"><div class="dp-bar"><i id="dpFill"></i></div><span id="dpText"></span></div>`;
  html += `<div class="exlist">`;
  d.ex.forEach((ex, i) => {
    const n = L.setsFor(ex, p, cut);
    const h = hist(ex.id);
    const sg = L.suggest(ex, p, h, today());
    const past = h.filter((e) => e.d < today());
    const last = past[past.length - 1];
    const cur = todayEntry(ex.id);
    const done = cur && cur.r.length >= n;
    const unit = ex.time ? `${ex.lo}–${ex.hi} นาที` : `${n} × ${ex.lo}–${ex.hi}`;
    const rest = ex.rest ? `<span>พัก ${ex.rest >= 60 ? Math.floor(ex.rest / 60) + ":" + String(ex.rest % 60).padStart(2, "0") : ex.rest + "s"}</span>` : "";
    html += `<article class="ex${done ? " done" : ""}" id="ex_${ex.id}" style="--i:${i}">
      <div class="ex-h"><span class="ex-n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(ex.n)}</h3>` +
      (ex.log !== false ? `<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" pathLength="1"/></svg>` : "") + `</div>
      <div class="rx"><span>${unit}</span>${rest}${ex.time ? "" : `<span>RIR ${p.rir}</span>`}</div>
      <p class="note">${esc(ex.note)}</p>` +
      (ex.setup ? `<p class="setup"><span class="label">ตั้งเครื่อง</span> ${esc(ex.setup)}</p>` : "");
    if (ex.log !== false) {
      html += `<div class="sugg"><span class="tag ${sg.kind}">${esc(sg.tag)}</span><span>${esc(sg.text)}</span>` +
        (last ? `<span class="last mono">ครั้งก่อน ${fmtDate(last.d)}: ${last.w.map((w, k) => w + "×" + last.r[k]).join(", ")}</span>` : "") + `</div>`;
      html += `<div class="sets">`;
      for (let s = 0; s < n; s++) {
        const wv = cur?.w[s] ?? "", rv = cur?.r[s] ?? "";
        html += `<div class="set"><label for="w_${ex.id}_${s}">S${s + 1}</label>
          <input id="w_${ex.id}_${s}" data-ex="${ex.id}" inputmode="decimal" placeholder="${sg.weight ?? "kg"}" value="${wv}" aria-label="น้ำหนักเซ็ต ${s + 1} (kg)">
          <input id="r_${ex.id}_${s}" data-ex="${ex.id}" data-rep="${s}" inputmode="numeric" placeholder="ครั้ง" value="${rv}" aria-label="จำนวนครั้งเซ็ต ${s + 1}"></div>`;
      }
      html += `</div><div class="row-actions">` +
        (ex.rest ? `<button class="btn ghost" data-rest="${ex.id}">เริ่มพัก</button>` : "") +
        `<span class="saved" id="ok_${ex.id}">${cur ? "บันทึกอัตโนมัติแล้ว" : ""}</span></div>`;
      if (h.length > 1) {
        html += `<details class="hist"><summary>ประวัติ ${h.length} ครั้ง</summary>${sparkline(h)}<table>` +
          h.slice().reverse().slice(0, 12).map((e) => `<tr><td>${fmtDate(e.d)}</td><td>W${e.wk ?? "-"}</td><td>${e.w.map((w, k) => w + "×" + e.r[k]).join("  ")}</td></tr>`).join("") +
          `</table></details>`;
      }
    }
    html += `</article>`;
  });
  v.innerHTML = html + `</div>`;

  v.querySelectorAll("input[data-ex]").forEach((inp) => {
    inp.addEventListener("input", () => scheduleSave(inp.dataset.ex));
    if (inp.dataset.rep !== undefined) inp.addEventListener("change", () => {
      if (inp.value.trim() !== "") startRest(inp.dataset.ex);
    });
  });
  v.querySelectorAll("[data-rest]").forEach((b) => b.addEventListener("click", () => startRest(b.dataset.rest)));
  updateProgress();
}

function updateProgress() {
  const d = DAYS[state.dayIdx], p = phase(), cut = cutOne();
  const loggable = d.ex.filter((e) => e.log !== false);
  const box = $("dayprog");
  if (!box || !loggable.length) return;
  const done = loggable.filter((e) => (todayEntry(e.id)?.r.length || 0) >= L.setsFor(e, p, cut)).length;
  const all = done === loggable.length;
  // let the bar paint at its old width first so the change animates
  requestAnimationFrame(() => { $("dpFill").style.width = (done / loggable.length) * 100 + "%"; });
  $("dpText").textContent = all ? "ครบทุกท่า จบวัน" : `${done}/${loggable.length} ท่า`;
  if (all && !box.classList.contains("complete") && box.dataset.ready) navigator.vibrate?.([60, 40, 60, 40, 120]);
  box.classList.toggle("complete", all);
  box.dataset.ready = "1";
}

// Celebrate once per exercise per day when every set reaches the top of the rep range.
const celebrated = new Set();
function celebrate(ex, weights) {
  const card = $("ex_" + ex.id);
  if (!card) return;
  card.querySelector(".pr")?.remove();
  const next = ex.inc ? `ครั้งหน้าขึ้นเป็น ${Math.round((Math.max(...weights) + ex.inc) * 100) / 100} kg` : "ครั้งหน้าเพิ่มความยาก";
  const el = document.createElement("div");
  el.className = "pr";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="pr-bar" aria-hidden="true"><i class="pr-plate a"></i><i class="pr-plate b"></i></div>
    <div><b>แตะเพดานครบทุกเซ็ต</b><span>${next}</span></div>`;
  card.querySelector(".row-actions").before(el);
  navigator.vibrate?.([40, 40, 90]);
}

const exById = (id) => DAYS.flatMap((d) => d.ex).find((e) => e.id === id);

const timers = {};
function scheduleSave(id) {
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => saveExercise(id), 400);
}
async function saveExercise(id) {
  const ex = exById(id), p = phase();
  const n = L.setsFor(ex, p, cutOne());
  const sg = L.suggest(ex, p, hist(id), today());
  const w = [], r = [];
  let bad = false;
  for (let s = 0; s < n; s++) {
    const wv = $(`w_${id}_${s}`).value.trim().replace(",", ".");
    const rv = $(`r_${id}_${s}`).value.trim();
    if (rv === "") continue;
    const wn = wv === "" ? (sg.weight ?? 0) : Number(wv);
    if (isNaN(wn) || isNaN(Number(rv))) { bad = true; continue; }
    w.push(wn); r.push(Number(rv));
  }
  const rec = state.logs[id] || { history: [] };
  rec.history = rec.history.filter((h) => h.d !== today());
  if (r.length) rec.history.push({ d: today(), w, r, wk: week() });
  rec.history.sort((a, b) => (a.d < b.d ? -1 : 1));
  rec.history = rec.history.slice(-120);
  if (rec.history.length) state.logs[id] = rec; else delete state.logs[id];
  await S.set("logs", state.logs);
  const ok = $("ok_" + id);
  if (ok) {
    ok.className = bad ? "err" : "saved";
    ok.textContent = bad ? "มีช่องที่ไม่ใช่ตัวเลข เซ็ตนั้นยังไม่ถูกบันทึก" : r.length ? "บันทึกอัตโนมัติแล้ว" : "";
  }
  $("ex_" + id)?.classList.toggle("done", r.length >= n);

  const key = id + "|" + today();
  const topped = !bad && r.length >= n && r.every((x) => x >= ex.hi) && p.mod !== "deload";
  if (topped && !celebrated.has(key)) { celebrated.add(key); celebrate(ex, w); }
  if (!topped) { celebrated.delete(key); $("ex_" + id)?.querySelector(".pr")?.remove(); }
  updateProgress();
}

/* ---------------- rest timer ---------------- */
let timerEnd = 0, timerTotal = 1, timerTick = null, audio = null;
function beep() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.25, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.2);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.2);
    });
  } catch { /* audio unavailable */ }
}
function startRest(id) {
  const ex = exById(id);
  if (!ex?.rest) return;
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* ignore */ }
  timerTotal = ex.rest * 1000;
  timerEnd = Date.now() + timerTotal;
  $("timerWhat").textContent = "พัก · " + ex.n;
  $("timer").hidden = false;
  $("timer").classList.remove("done", "urgent");
  clearInterval(timerTick);
  timerTick = setInterval(tickTimer, 250);
  tickTimer();
}
function tickTimer() {
  const ms = Math.max(0, timerEnd - Date.now());
  const left = Math.ceil(ms / 1000);
  $("timerT").textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
  $("timerRing").style.strokeDashoffset = String(100 * (1 - Math.min(1, ms / timerTotal)));
  $("timer").classList.toggle("urgent", left > 0 && left <= 10);
  if (left === 0) {
    clearInterval(timerTick);
    $("timer").classList.add("done");
    $("timerT").textContent = "ไปต่อ!";
    navigator.vibrate?.([300, 150, 300]);
    beep();
  }
}
$("timerPlus").onclick = () => {
  if ($("timer").classList.contains("done")) {
    timerEnd = Date.now(); timerTotal = 0;
    $("timer").classList.remove("done");
    timerTick = setInterval(tickTimer, 250);
  }
  timerEnd += 30000; timerTotal += 30000; tickTimer();
};
$("timerStop").onclick = () => { clearInterval(timerTick); $("timer").hidden = true; };

/* ---------------- food ---------------- */
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Body weight used for targets: 7-day average, else latest entry, else the starting 77 kg.
function currentKg() {
  const tr = L.bodyTrend(state.body, today());
  if (tr.cur != null) return { kg: tr.cur, src: "ค่าเฉลี่ย 7 วัน" };
  const last = state.body[state.body.length - 1];
  return last ? { kg: last.kg, src: "ชั่งล่าสุด" } : { kg: 77, src: "น้ำหนักตั้งต้น" };
}

async function addFood(entry) {
  const d = today();
  state.food[d] = (state.food[d] || []).concat({ id: uid(), ...entry });
  await S.set("food", state.food);
  renderFood();
}

function bar(label, have, goal, unit) {
  const pct = goal ? Math.min(100, (have / goal) * 100) : 0;
  const over = goal && have > goal * 1.1;
  return `<div class="macro"><div class="macro-h"><span class="label">${label}</span>
    <span class="mono">${Math.round(have)} / ${goal} ${unit}</span></div>
    <div class="dp-bar"><i style="width:${pct}%;${over ? "background:var(--warn)" : ""}"></i></div></div>`;
}

function renderFood() {
  const d = today(), s = state.settings;
  const { kg, src } = currentKg();
  const cm = s.height || 183;
  const age = s.dob ? L.ageOn(s.dob, d) : s.age;
  const tg = age ? L.targets(kg, cm, age) : null;
  const entries = state.food[d] || [];
  const tot = L.dayTotals(entries);
  const meals = L.groupMeals(entries);
  const trend = L.bodyTrend(state.body, d).verdict;
  const trendTip = { slow: "น้ำหนักขึ้นช้ากว่าเป้า ถ้าเป็นแบบนี้ 2 สัปดาห์ติด เพิ่มอีก 150–200 kcal", fast: "น้ำหนักขึ้นเร็วเกินเป้า ลดลง 150 kcal", ok: "น้ำหนักขึ้นตรงเป้า กินเท่านี้ต่อ" }[trend];

  // Readiness: the most recent meal decides when lifting is comfortable.
  const lastMeal = meals[meals.length - 1];
  const dayName = DAYS.find((x) => x.dow === new Date().getDay());
  let ready = `<p class="note">ยังไม่ได้บันทึกมื้อวันนี้ บันทึกมื้อล่าสุดแล้วแอปจะบอกว่าซ้อมได้ตั้งแต่กี่โมง</p>`;
  if (lastMeal) {
    const wait = L.digestWait(lastMeal);
    const readyAt = lastMeal.start + wait;
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const planned = lastMeal.start > nowM; // logged with a time later than now
    const leftM = planned ? 0 : readyAt - nowM;
    const status = planned ? `<span class="tag">มื้อที่วางแผนไว้</span> ซ้อมได้หลัง ${L.fromMin(readyAt)}`
      : `<span class="tag ${leftM > 0 ? "hold" : "up"}">${leftM > 0 ? "ยังไม่พร้อม" : "พร้อมซ้อม"}</span>` +
        (leftM > 0 ? ` อีก ${Math.floor(leftM / 60) ? Math.floor(leftM / 60) + " ชม. " : ""}${leftM % 60} นาที` : "");
    ready = `<div class="big">${L.fromMin(readyAt)}</div>
      <p>มื้อล่าสุด ${lastMeal.t} · <span class="mono">${lastMeal.kcal} kcal · ไขมัน ${Math.round(lastMeal.f)} g</span> → รอ <b>${wait >= 60 ? wait / 60 + " ชม." : wait + " นาที"}</b></p>
      <p>${status}</p>
      ${lastMeal.f >= 25 ? `<p class="note">มื้อนี้ไขมันสูง ย่อยช้า ถ้าจะกินก่อนซ้อมครั้งหน้า ลดไข่เจียวหรือน้ำมัน แล้วเพิ่มข้าวแทน</p>` : ""}`;
  }

  const recent = [];
  const seen = new Set();
  Object.keys(state.food).sort().reverse().forEach((day) => (state.food[day] || []).slice().reverse().forEach((e) => {
    const key = e.n + "|" + e.qty;
    if (!seen.has(key) && recent.length < 8) { seen.add(key); recent.push(e); }
  }));

  $("p-food").innerHTML = `
    <h2>อาหาร</h2>
    <div class="grid2">
      <div class="card">
        <h3>เป้าต่อวัน</h3>
        <div class="field">
          <label for="dob">วันเกิด</label><input type="date" id="dob" min="1940-01-01" max="${d}" value="${s.dob ?? ""}">
          ${age ? `<span class="mono">อายุ ${age} ปี</span>` : ""}
        </div>
        <div class="field">
          <label for="height">สูง</label><input type="number" id="height" min="140" max="220" inputmode="numeric" value="${cm}"><span>cm</span>
        </div>
        ${tg ? `<div class="big">${tg.kcal.toLocaleString()} kcal</div>
          <p class="mono">โปรตีน ${tg.p} g · คาร์บ ${tg.c} g · ไขมัน ${tg.f} g</p>
          <p class="note">ใช้น้ำหนัก ${kg.toFixed(1)} kg (${src}) · ใช้พลังงานต่อวัน ~${tg.tdee.toLocaleString()} kcal + ส่วนเกิน ${L.SURPLUS} kcal สำหรับสร้างกล้าม</p>
          ${trendTip ? `<p class="note">${trendTip}</p>` : ""}`
        : `<p class="note">กรอกวันเกิดเพื่อคำนวณให้ตรงตัว ระหว่างนี้ใช้ช่วง 2,900–3,100 kcal</p>`}
      </div>
      <div class="card">
        <h3>พร้อมซ้อมเมื่อไร</h3>
        ${dayName?.ex.length ? `<p class="note">วันนี้: ${esc(dayName.title)}</p>` : ""}
        ${ready}
      </div>
    </div>

    <div class="card">
      <h3>วันนี้กินไปแล้ว</h3>
      <div class="macros">
        ${bar("พลังงาน", tot.kcal, tg?.kcal ?? 3000, "kcal")}
        ${bar("โปรตีน", tot.p, tg?.p ?? 154, "g")}
        ${bar("คาร์บ", tot.c, tg?.c ?? 400, "g")}
        ${bar("ไขมัน", tot.f, tg?.f ?? 77, "g")}
      </div>
      ${meals.length ? meals.map((m) => `<div class="meal"><div class="meal-h"><b class="mono">${m.t}</b><span class="mono">${m.kcal} kcal · P${Math.round(m.p)} C${Math.round(m.c)} F${Math.round(m.f)}</span></div>
        ${m.items.map((e) => `<div class="fitem"><span>${esc(e.n)} <span class="mono">${e.qty} ${esc(e.unit)}</span></span><span class="mono">${e.kcal}</span>
          <button class="x" data-del="${e.id}" aria-label="ลบ ${esc(e.n)}">×</button></div>`).join("")}</div>`).join("")
        : `<p class="note">ยังไม่มีรายการ เพิ่มอาหารด้านล่าง</p>`}
    </div>

    <div class="card">
      <h3>เพิ่มอาหาร</h3>
      <div class="field">
        <select id="fsel" aria-label="อาหาร">${FOODS.map((f) => `<option value="${f.id}">${esc(f.n)}</option>`).join("")}</select>
      </div>
      <div class="field">
        <input type="number" id="fqty" min="0" step="any" inputmode="decimal" aria-label="ปริมาณ"><span id="funit"></span>
        <input type="time" id="ftime" value="${nowHM()}" aria-label="เวลาที่กิน">
        <button class="btn" id="fadd">เพิ่ม</button>
      </div>
      <p class="note mono" id="fprev"></p>
      ${recent.length ? `<div><span class="label">กินบ่อย แตะเพื่อเพิ่มตอนนี้</span><div class="chips">${recent.map((e, i) => `<button class="chipbtn" data-recent="${i}">${esc(e.n)} ${e.qty} ${esc(e.unit)}</button>`).join("")}</div></div>` : ""}
      <details class="hist"><summary>อาหารที่ไม่มีในรายการ</summary>
        <div class="field" style="margin-top:8px">
          <input id="cn" placeholder="ชื่ออาหาร" aria-label="ชื่ออาหาร" style="width:100%">
          <input type="number" id="ck" placeholder="kcal" aria-label="kcal">
          <input type="number" id="cp" placeholder="โปรตีน g" aria-label="โปรตีน g">
          <input type="number" id="cc" placeholder="คาร์บ g" aria-label="คาร์บ g">
          <input type="number" id="cf" placeholder="ไขมัน g" aria-label="ไขมัน g">
          <button class="btn ghost" id="cadd">เพิ่ม</button><span id="cerr" class="err"></span>
        </div>
      </details>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>กินก่อนซ้อมยังไง</h3>
        <div class="tbl"><table>
          <tr><th>ก่อนซ้อม</th><th>กินอะไร</th></tr>
          <tr><td>2.5–3 ชม.</td><td>มื้อเต็ม 600–800 kcal: ข้าว 250 g + หมู/ไก่ 150–200 g</td></tr>
          <tr><td>1.5–2 ชม.</td><td>มื้อเล็ก 400–500 kcal: ข้าว 150–200 g + ไข่ต้ม 2–3 ฟอง</td></tr>
          <tr><td>30–60 นาที</td><td>คาร์บย่อยง่าย: กล้วย 1–2 ลูก หรือขนมปัง 2 แผ่น</td></tr>
        </table></div>
        <p class="note">ก่อนซ้อมเน้นคาร์บ 60–100 g กับโปรตีน 25–40 g ไขมันและผักไม่ต้องเยอะ เพราะทำให้ย่อยช้าและจุกตอนเล่นขา</p>
        <p class="note">คาเฟอีน 150–250 mg (กาแฟดำ 1–2 แก้ว) 30–60 นาทีก่อนซ้อม ช่วยให้ยกได้ดีขึ้นจริง ถ้าซ้อมเย็นหลัง 4 โมง ข้ามไป เพราะจะกวนการนอน Pre-workout แบบผงส่วนใหญ่ก็คือคาเฟอีนราคาแพง</p>
      </div>
      <div class="card">
        <h3>หลังซ้อม และทั้งวัน</h3>
        <ul>
          <li>หลังซ้อมภายใน 1–2 ชม.: ข้าวเยอะ + โปรตีน 35–40 g</li>
          <li>แบ่งโปรตีนเป็น 4 มื้อ มื้อละ 35–45 g ดีกว่าอัดมื้อเดียว</li>
          <li>หมูลีน 500–600 g (ดิบ) ได้โปรตีน 105–130 g แต่ไขมันน้อย ระวังไขมันรวมต่ำกว่า 60 g ซึ่งไม่ดีต่อฮอร์โมน</li>
          <li>ไข่ทั้งฟองวันละ 3–6 ฟองได้ ให้ทั้งโปรตีน ไขมัน และสังกะสี แต่วางไว้มื้อที่ไม่ใช่ก่อนซ้อม</li>
          <li>มาม่า โซเดียมราว 1,500 mg ต่อซอง ไม่เกินวันละ 1 ซอง</li>
          <li>Creatine monohydrate 3–5 g ทุกวัน เวลาไหนก็ได้ นอน 7.5–9 ชม.</li>
        </ul>
      </div>
    </div>`;

  const fsel = $("fsel"), fqty = $("fqty");
  const syncFood = (resetQty) => {
    const f = foodById(fsel.value);
    if (resetQty) fqty.value = f.def;
    $("funit").textContent = f.unit;
    const q = Number(fqty.value) || 0;
    const v = portion(f, q);
    $("fprev").textContent = `${v.kcal} kcal · โปรตีน ${v.p} g · คาร์บ ${v.c} g · ไขมัน ${v.f} g`;
  };
  if (s.lastFood && foodById(s.lastFood)) fsel.value = s.lastFood;
  syncFood(true);
  fsel.onchange = () => syncFood(true);
  fqty.oninput = () => syncFood(false);
  $("fadd").onclick = async () => {
    const f = foodById(fsel.value), q = Number(fqty.value);
    if (!q || q <= 0) { $("fprev").textContent = "กรอกปริมาณมากกว่า 0"; return; }
    state.settings.lastFood = f.id;
    await S.set("settings", state.settings);
    await addFood({ t: $("ftime").value || nowHM(), n: f.n, qty: q, unit: f.unit, fid: f.id, ...portion(f, q) });
  };
  document.querySelectorAll("[data-recent]").forEach((b) => b.onclick = () => {
    const e = recent[+b.dataset.recent];
    addFood({ t: nowHM(), n: e.n, qty: e.qty, unit: e.unit, fid: e.fid, kcal: e.kcal, p: e.p, c: e.c, f: e.f });
  });
  document.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    state.food[d] = (state.food[d] || []).filter((e) => e.id !== b.dataset.del);
    await S.set("food", state.food);
    renderFood();
  });
  $("cadd").onclick = () => {
    const n = $("cn").value.trim(), k = Number($("ck").value);
    if (!n || !k) { $("cerr").textContent = "ใส่ชื่อและ kcal อย่างน้อย"; return; }
    addFood({ t: nowHM(), n, qty: 1, unit: "ที่", kcal: Math.round(k), p: Number($("cp").value) || 0, c: Number($("cc").value) || 0, f: Number($("cf").value) || 0 });
  };
  const saveProfile = async () => {
    const dob = $("dob").value, h = Number($("height").value);
    const a = dob ? L.ageOn(dob, d) : 0;
    state.settings.dob = a >= 15 && a <= 80 ? dob : undefined;
    state.settings.height = h >= 140 && h <= 220 ? h : 183;
    await S.set("settings", state.settings);
    renderFood();
  };
  $("dob").onchange = saveProfile;
  $("height").onchange = saveProfile;
}

/* ---------------- body weight ---------------- */
function renderBody() {
  const t = today();
  const cur = state.body.find((e) => e.d === t);
  const tr = L.bodyTrend(state.body, t);
  const verdict = { slow: ["ขึ้นช้ากว่าเป้า", "ถ้าเป็นแบบนี้ 2 สัปดาห์ติด เพิ่มอาหาร 150–200 kcal/วัน", "hold"],
    fast: ["ขึ้นเร็วกว่าเป้า", "อาจเป็นไขมันมากกว่ากล้าม ลดลง 150 kcal/วัน", "down"],
    ok: ["ตรงเป้า", "ขึ้น 0.2–0.35 kg/สัปดาห์ ทำแบบนี้ต่อ", "up"] }[tr.verdict];
  const rows = state.body.slice().reverse().slice(0, 14);
  $("p-body").innerHTML = `
    <h2>น้ำหนักตัว</h2>
    <div class="grid2">
      <div class="card">
        <h3>ชั่งเช้านี้</h3>
        <p class="note">ชั่งหลังเข้าห้องน้ำ ก่อนกินอะไร ใช้ค่าเฉลี่ย 7 วัน ไม่ต้องตกใจกับตัวเลขรายวัน</p>
        <div class="field"><input type="number" id="bw" step="0.1" min="30" max="200" inputmode="decimal" value="${cur?.kg ?? ""}" placeholder="77.0" aria-label="น้ำหนักตัววันนี้ (kg)"><span>kg</span><button class="btn" id="bwSave">บันทึก</button><span id="bwOk" class="saved"></span></div>
      </div>
      <div class="card">
        <h3>ค่าเฉลี่ย 7 วัน</h3>
        <div class="big">${tr.cur != null ? tr.cur.toFixed(1) + " kg" : "–"}</div>
        ${tr.delta != null
          ? `<p><span class="tag ${verdict[2]}">${verdict[0]}</span> <span class="mono">${tr.delta >= 0 ? "+" : ""}${tr.delta.toFixed(2)} kg</span> จากสัปดาห์ก่อน</p><p class="note">${verdict[1]}</p>`
          : `<p class="note">ต้องมีข้อมูลอย่างน้อย 2 สัปดาห์ถึงจะเทียบแนวโน้มได้</p>`}
      </div>
    </div>
    ${rows.length ? `<div class="card"><h3>14 ครั้งล่าสุด</h3><div class="tbl"><table><tr><th>วันที่</th><th>kg</th></tr>${rows.map((e) => `<tr><td>${fmtDate(e.d)}</td><td class="num">${e.kg.toFixed(1)}</td></tr>`).join("")}</table></div></div>` : ""}`;
  $("bwSave").onclick = async () => {
    const kg = Number($("bw").value.replace(",", "."));
    if (!kg || kg < 30 || kg > 200) { $("bwOk").className = "err"; $("bwOk").textContent = "กรอกน้ำหนักระหว่าง 30–200 kg"; return; }
    state.body = state.body.filter((e) => e.d !== t).concat({ d: t, kg }).sort((a, b) => (a.d < b.d ? -1 : 1));
    await S.set("body", state.body);
    renderBody();
    $("bwOk").textContent = "บันทึกแล้ว";
  };
}

/* ---------------- check-in ---------------- */
function renderCheck() {
  const t = today();
  const c = state.checkins[t] || {};
  const dots = [];
  for (let i = 13; i >= 0; i--) {
    const d = L.addDays(t, -i), ci = state.checkins[d];
    const cls = !ci ? "" : L.redDay(ci) ? "r" : L.SIGNS.some((s) => ci[s.k]) ? "y" : "g";
    dots.push(`<span class="dot"><i class="${cls}"></i>${fmtDate(d)}</span>`);
  }
  $("p-check").innerHTML = `
    <h2>Check-in ตอนเช้า</h2>
    ${cutOne() ? `<div class="banner bad"><b>มีสัญญาณเตือน 2 ข้อขึ้นไป 3 วันติด</b> วันนี้แอปตัดเซ็ตทุกท่าลง 1 เซ็ต ให้เพิ่มอาหารและนอนให้มากขึ้น ถ้าไม่ดีขึ้นใน 2 สัปดาห์ควรตรวจเลือด</div>` : ""}
    <div class="grid2">
      <div class="card">
        <h3>วันนี้มีข้อไหนบ้าง</h3>
        <p class="note">ติ๊กเฉพาะข้อที่เป็น ไม่มีข้อไหนเลยก็กดบันทึกได้ (นับเป็นวันเขียว)</p>
        <div class="checks">${L.SIGNS.map((s) => `<label><input type="checkbox" id="ck_${s.k}" ${c[s.k] ? "checked" : ""}>${esc(s.t)}</label>`).join("")}</div>
        <div class="row-actions"><button class="btn" id="ckSave">บันทึก check-in</button><span id="ckOk" class="saved">${state.checkins[t] ? "บันทึกวันนี้แล้ว" : ""}</span></div>
      </div>
      <div class="card">
        <h3>14 วันล่าสุด</h3>
        <div class="dots">${dots.join("")}</div>
        <p class="note">เขียว = ปกติ · เหลือง = 1 ข้อ · แดง = 2 ข้อขึ้นไป · เทา = ไม่ได้บันทึก</p>
      </div>
    </div>`;
  $("ckSave").onclick = async () => {
    const rec = {};
    L.SIGNS.forEach((s) => (rec[s.k] = $("ck_" + s.k).checked));
    state.checkins[t] = rec;
    await S.set("checkins", state.checkins);
    renderCheck();
  };
}

/* ---------------- backup ---------------- */
function renderData() {
  const sessions = Object.values(state.logs).reduce((a, r) => a + r.history.length, 0);
  const days = new Set(Object.values(state.logs).flatMap((r) => r.history.map((h) => h.d))).size;
  $("p-data").innerHTML = `
    <h2>สำรองข้อมูล</h2>
    <div class="grid2">
      <div class="card">
        <h3>ข้อมูลในเครื่องนี้</h3>
        <p><span class="mono">${days}</span> วันที่ซ้อม · <span class="mono">${sessions}</span> รายการท่า · <span class="mono">${state.body.length}</span> ครั้งที่ชั่งน้ำหนัก</p>
        <p class="note">เริ่มบล็อก ${fmtDate(state.settings.startDate)} · สำรองล่าสุด ${state.settings.lastExport ? new Date(state.settings.lastExport).toLocaleDateString("th-TH") : "ยังไม่เคย"}</p>
        <p class="note">ข้อมูลอยู่ในเบราว์เซอร์ของเครื่องนี้ ถ้าล้างข้อมูลเว็บหรือเปลี่ยนเครื่องจะหาย ควร Export ทุกสัปดาห์</p>
        <div class="row-actions"><button class="btn" id="exp">Export ไฟล์ JSON</button></div>
      </div>
      <div class="card">
        <h3>นำเข้าไฟล์สำรอง</h3>
        <p class="note">รวมข้อมูลจากไฟล์เข้ากับของเดิม วันที่ซ้ำกันจะใช้ค่าจากไฟล์ ไม่ลบรายการที่ใหม่กว่า</p>
        <div class="row-actions"><input type="file" id="imp" accept="application/json,.json"><span id="impOk"></span></div>
      </div>
    </div>`;
  $("exp").onclick = async () => {
    const data = await S.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `godskin-backup-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    state.settings.lastExport = new Date().toISOString();
    await S.set("settings", state.settings);
    renderData();
  };
  $("imp").onchange = async (e) => {
    const out = $("impOk");
    try {
      const inc = JSON.parse(await e.target.files[0].text());
      if (inc.app !== "godskin") throw new Error("ไม่ใช่ไฟล์สำรองของ Godskin");
      const merged = S.mergeData(state, inc);
      Object.assign(state, merged);
      for (const k of S.KEYS) await S.set(k, state[k]);
      renderAll();
      $("impOk").className = "saved"; $("impOk").textContent = "นำเข้าเรียบร้อย";
    } catch (err) {
      out.className = "err";
      out.textContent = "นำเข้าไม่ได้: " + (err.message || "ไฟล์เสีย");
    }
  };
}

boot();
