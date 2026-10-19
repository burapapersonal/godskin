import { PHASES, DAYS, SWAPS, altFor, altName } from "./program.js";
import * as L from "./logic.js";
import * as S from "./store.js";
import { FOODS, foodById as builtinFood, portion, baseQty } from "./foods.js";
import { MOVE_OF, mountMove } from "./moves.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtDate = (d) => { const [, m, dd] = d.split("-"); return `${+dd}/${+m}`; };

const state = {
  logs: {},       // exId -> { history: [{ d, w:[], r:[], wk }] }
  settings: {},   // { startDate, lastExport }
  body: [],       // [{ d, kg }]
  checkins: {},   // date -> { noMorning, lowLibido, ... }
  food: {},       // date -> [{ id, t:"HH:MM", n, qty, unit, kcal, p, c, f }]
  measures: [],   // [{ d, arm, chest, waist }] in cm
  myfoods: [],    // user-added foods, same shape as FOODS, ids start with "my_"
  sex: {},        // date -> { erect, stamina } each 1–5
  done: {},       // date -> [exId] for items without sets (cardio, mobility)
  tab: "train",
  dayIdx: 0,
};
const today = () => L.isoDate();
const week = () => L.weekFor(state.settings.startDate, today());
const phase = () => PHASES[week()];
const cutOne = () => L.needsCut(state.checkins, today());

/* ---------------- motion ---------------- */
// on: animate even when the phone asks for reduced motion (the user turned this on in the app);
// auto: follow the phone; off: no animation at all.
function applyMotion() {
  const m = state.settings.motion || "on";
  document.documentElement.classList.toggle("motion-on", m === "on");
  document.documentElement.classList.toggle("motion-off", m === "off");
}

/* small symbols shared by the day chips and the calendar */
const ICON = {
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path class="pulse" d="M5 11h3l1.5-3 3 6 1.5-3H19"/></svg>`,
  food: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1-3 4-3 7h3v11"/></svg>`,
  scale: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8 9a5 5 0 0 1 8 0l-3 3"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/></svg>`,
  cam: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`,
};

/* ---------------- boot ---------------- */
async function boot() {
  state.logs = await S.get("logs", {});
  state.settings = await S.get("settings", {});
  state.body = await S.get("body", []);
  state.checkins = await S.get("checkins", {});
  state.food = await S.get("food", {});
  state.measures = await S.get("measures", []);
  state.myfoods = await S.get("myfoods", []);
  state.sex = await S.get("sex", {});
  state.done = await S.get("done", {});
  applyMotion();
  state.photos = await S.get("photos", []);   // [{ id, d, pose }]; images under "photo:<id>"
  if (!state.settings.startDate) {
    state.settings.startDate = L.startForWeek(1, today());
    state.settings.startAuto = true;
    await S.set("settings", state.settings);
  }
  const dow = new Date().getDay();
  state.dayIdx = Math.max(0, DAYS.findIndex((d) => d.dow === dow));
  const hash = location.hash.slice(1);
  if (["train", "cal", "goals", "food", "body", "check", "rules", "data"].includes(hash)) state.tab = hash;

  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    state.tab = b.dataset.tab;
    history.replaceState(null, "", "#" + state.tab);
    renderTabs();
  }));
  window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (document.getElementById("p-" + h) && h !== state.tab) { state.tab = h; renderTabs(); }
  });
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
  ({ train: renderTrain, cal: renderCal, goals: renderGoals, food: renderFood, body: renderBody, check: renderCheck, data: renderData, rules: () => {} })[state.tab]();
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
    b.onclick = () => askWeek(i);
    el.appendChild(b);
  }
  $("phaseName").textContent = phase().name;
  $("phaseDesc").textContent = `${phase().desc} · เริ่มบล็อก ${fmtDate(state.settings.startDate)}`;
}
// Weeks with at least one logged set, counted back from today.
function trainedWeeks() {
  const days = new Set(Object.values(state.logs).flatMap((r) => r.history.map((h) => L.mondayOf(h.d))));
  return days.size;
}
function askWeek(i) {
  const box = $("weekAsk"), cur = week();
  if (i === cur) { box.hidden = true; return; }
  const warn = [];
  const tw = trainedWeeks();
  if (i >= 3 && cur <= 2) warn.push(tw < 2 ? `ซ้อมจริงมาแค่ ${tw} สัปดาห์ ข้ามช่วง Re-entry หลังขลิบเร็วไป น้ำหนักจะขึ้นเร็วเกินกว่าแผลและข้อต่อจะรับไหว` : "ออกจากช่วง Re-entry: RIR ลดลงและเริ่มเพิ่มน้ำหนักเต็มที่");
  if (i === 8) warn.push("สัปดาห์ 8 คือ deload เซ็ตลดครึ่งทุกท่า");
  if (i < cur) warn.push("ย้อนสัปดาห์: ประวัติการซ้อมไม่หาย แต่ RIR และสัปดาห์ deload จะนับใหม่");
  box.innerHTML = `<p><b>ตั้งให้สัปดาห์นี้เป็นสัปดาห์ ${i}?</b> บล็อกจะนับเริ่มจาก ${fmtDate(L.startForWeek(i, today()))}</p>` +
    warn.map((w) => `<p class="${i >= 3 && cur <= 2 && tw < 2 && w === warn[0] ? "err" : "note"}">${w}</p>`).join("") +
    `<div class="row-actions"><button class="btn" id="weekYes">ยืนยัน</button><button class="btn ghost" id="weekNo">ยกเลิก</button></div>`;
  box.hidden = false;
  $("weekNo").onclick = () => { box.hidden = true; };
  $("weekYes").onclick = async () => {
    state.settings.startDate = L.startForWeek(i, today());
    state.settings.startAuto = false;
    await S.set("settings", state.settings);
    box.hidden = true;
    renderAll();
  };
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
    b.innerHTML = `<span class="plate">${d.code}</span><span class="dn">${d.th}</span><small>${esc(d.title)}</small>` +
      (d.ex.some((e) => e.cardio) ? `<span class="cardio" title="มีคาร์ดิโอ">${ICON.heart}</span>` : "");
    b.onclick = () => { state.dayIdx = i; renderDays(); renderDay(); };
    el.appendChild(b);
  });
}

function hist(id) { return state.logs[id]?.history || []; }
const isDone = (id, d = today()) => (state.done[d] || []).includes(id);
// "Superset: A + B" searches for the first movement; "·" variants read better as plain words.
const ytQuery = (n) => n.replace(/^Superset:\s*/, "").split(" + ")[0].replace(/[·()]/g, " ").replace(/\s+/g, " ").trim() + " proper form";
// The day's exercises with the user's swaps applied.
const swaps = () => state.settings.swaps || {};
const dayEx = (d) => d.ex.map((e) => altFor(e, swaps()[e.id]));
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
  const orig = d.ex;
  dayEx(d).forEach((ex, i) => {
    shownEx[ex.id] = ex;
    const base = orig[i], alts = SWAPS[base.id] || [];
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
      (alts.length ? `<button class="swapbtn" data-swapopen="${base.id}" aria-expanded="false" aria-controls="sw_${base.id}">สลับท่า</button>` : "") +
      (ex.log !== false ? `<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" pathLength="1"/></svg>` : "") + `</div>` +
      (alts.length ? `<div class="swap" id="sw_${base.id}" hidden><span class="label">เครื่องไม่ว่างหรือไหล่ไม่โอเค เลือกท่าแทน (จำไว้จนกว่าจะเปลี่ยนกลับ)</span><div class="chips">` +
        [base.id, ...alts].map((a) => `<button class="chipbtn" data-swap="${base.id}" data-to="${a}" aria-pressed="${a === ex.id}">${esc(a === base.id ? base.n + " (เดิม)" : altName(a))}</button>`).join("") +
        `</div></div>` : "") +
      (ex.swappedFrom ? `<p class="setup"><span class="label">ท่าแทน</span> ใช้แทน ${esc(base.n)} ประวัติแยกตามท่า</p>` : "") + `
      <div class="rx"><span>${unit}</span>${rest}${ex.time ? "" : `<span>RIR ${p.rir}</span>`}</div>
      <p class="note">${esc(ex.note)}</p>` +
      (ex.setup ? `<p class="setup"><span class="label">ตั้งเครื่อง</span> ${esc(ex.setup)}</p>` : "") +
      (ex.log === false ? `<div class="row-actions"><button class="btn${isDone(ex.id) ? "" : " ghost"}" data-done="${ex.id}" aria-pressed="${isDone(ex.id)}">${isDone(ex.id) ? "ทำแล้ว ✓" : "ทำเสร็จแล้ว"}</button></div>` : "") +
      (ex.log !== false ? `<details class="move"><summary>ดูท่า</summary>` +
        (MOVE_OF[ex.id] ? `<svg class="mv" data-move="${ex.id}" role="img" aria-label="ภาพเคลื่อนไหวท่า ${esc(ex.n)}"></svg>
          <p class="note">ภาพคร่าวๆ ให้เห็นทางเดินของท่า สีเทาคือท่าเริ่ม ขึ้นเร็ว 1 วินาที ลงช้า 1.5 วินาที แตะภาพเพื่อหยุดหรือเล่นต่อ รายละเอียดฟอร์มดูจากคลิปจริง</p>` : "") +
        `<a class="yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery(ex.n))}" target="_blank" rel="noopener">ดูคลิปจริงบน YouTube ↗</a></details>` : "");
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
  v.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
    const d = today(), id = b.dataset.done, list = new Set(state.done[d] || []);
    if (list.has(id)) list.delete(id); else list.add(id);
    state.done[d] = [...list];
    if (!list.size) delete state.done[d];
    await S.set("done", state.done);
    renderDay();
  }));
  v.querySelectorAll("details.move").forEach((dt) => dt.addEventListener("toggle", () => {
    const svg = dt.querySelector("svg[data-move]");
    if (dt.open && svg) mountMove(svg, svg.dataset.move);
  }));
  v.querySelectorAll("[data-swapopen]").forEach((b) => b.addEventListener("click", () => {
    const box = $("sw_" + b.dataset.swapopen);
    box.hidden = !box.hidden;
    b.setAttribute("aria-expanded", String(!box.hidden));
  }));
  v.querySelectorAll("[data-swap]").forEach((b) => b.addEventListener("click", async () => {
    const all = { ...swaps() };
    if (b.dataset.to === b.dataset.swap) delete all[b.dataset.swap]; else all[b.dataset.swap] = b.dataset.to;
    state.settings.swaps = all;
    await S.set("settings", state.settings);
    renderDay();
  }));
  updateProgress();
}

function updateProgress() {
  const d = DAYS[state.dayIdx], p = phase(), cut = cutOne();
  const loggable = dayEx(d).filter((e) => e.log !== false);
  const box = $("dayprog");
  if (!box || !loggable.length) return;
  const done = loggable.filter((e) => (todayEntry(e.id)?.r.length || 0) >= L.setsFor(e, p, cut)).length;
  const all = done === loggable.length;
  // let the bar paint at its old width first so the change animates
  requestAnimationFrame(() => { $("dpFill").style.width = (done / loggable.length) * 100 + "%"; });
  $("dpText").textContent = all ? "ครบทุกท่า จบวัน" : `${done}/${loggable.length} ท่า`;
  if (all && !box.classList.contains("complete") && box.dataset.ready) {
    navigator.vibrate?.([60, 40, 60, 40, 120]);
    if (state.settings.finishDay !== today()) showFinish(d);
  }
  box.classList.toggle("complete", all);
  box.dataset.ready = "1";
}

// Whole-day finish: plates load onto a bar, the day's numbers count up, confetti in plate colours.
async function showFinish(d) {
  state.settings.finishDay = today();
  await S.set("settings", state.settings);
  const ex = dayEx(d).filter((e) => e.log !== false);
  let sets = 0, vol = 0, topped = 0;
  for (const e of ex) {
    const h = todayEntry(e.id);
    if (!h) continue;
    sets += h.r.length;
    vol += h.w.reduce((a, w, k) => a + w * h.r[k], 0);
    if (h.r.every((r) => r >= e.hi)) topped++;
  }
  const cardio = d.ex.find((e) => e.cardio && !isDone(e.id));
  const colors = ["--p-red", "--p-blue", "--p-yellow", "--p-green"];
  const el = document.createElement("div");
  el.className = "finish";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "จบวัน");
  el.innerHTML = `<div class="confetti" aria-hidden="true">${Array.from({ length: 36 }, (_, i) =>
      `<i style="--x:${(i * 37) % 100}vw;--d:${(i % 7) * 90}ms;--r:${(i * 53) % 360}deg;--c:var(${colors[i % 4]})"></i>`).join("")}</div>
    <div class="fin-card">
      <svg class="fin-bar" viewBox="0 0 240 96" aria-hidden="true">
        <line class="fb-bar" x1="8" y1="48" x2="232" y2="48"/>
        <rect class="fb-col" x="62" y="38" width="6" height="20" rx="2"/><rect class="fb-col" x="172" y="38" width="6" height="20" rx="2"/>
        <g class="fb-l"><rect x="44" y="12" width="14" height="72" rx="3" style="fill:var(--p-red)"/><rect x="28" y="20" width="12" height="56" rx="3" style="fill:var(--p-blue)"/><rect x="14" y="28" width="10" height="40" rx="3" style="fill:var(--p-yellow)"/></g>
        <g class="fb-r"><rect x="182" y="12" width="14" height="72" rx="3" style="fill:var(--p-red)"/><rect x="200" y="20" width="12" height="56" rx="3" style="fill:var(--p-blue)"/><rect x="216" y="28" width="10" height="40" rx="3" style="fill:var(--p-yellow)"/></g>
        <path class="fb-check" d="M100 50l14 14 28-30" pathLength="1"/>
      </svg>
      <h2>จบวันแล้ว</h2>
      <p class="label">${esc(d.title)} · สัปดาห์ ${week()}</p>
      <div class="fin-stats">
        <div><b data-count="${ex.length}">0</b><span>ท่า</span></div>
        <div><b data-count="${sets}">0</b><span>เซ็ต</span></div>
        <div><b data-count="${Math.round(vol)}">0</b><span>kg รวม</span></div>
      </div>
      ${topped ? `<p>แตะเพดานครบ <b>${topped}</b> ท่า ครั้งหน้าแอปจะให้เพิ่มน้ำหนัก</p>` : ""}
      ${cardio ? `<p class="note">ยังเหลือ ${esc(cardio.n)} ${cardio.lo}–${cardio.hi} นาที ถ้ายังไหว</p>` : ""}
      <p class="note">กินมื้อหลังซ้อมภายใน 1–2 ชม.: ข้าว + โปรตีน 35–40 g แล้วพักให้พอ</p>
      <button class="btn" id="finOk">เยี่ยม</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelectorAll("[data-count]").forEach((b) => {
    const to = Number(b.dataset.count), t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      b.textContent = Math.round(to * (1 - (1 - k) ** 3)).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 250); };
  $("finOk").onclick = close;
  el.addEventListener("click", (e) => { if (e.target === el) close(); });
  $("finOk").focus();
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

// Exercises as currently shown (after swaps), so saving uses the swapped movement's rep range.
const shownEx = {};
const exById = (id) => shownEx[id] || DAYS.flatMap((d) => d.ex).find((e) => e.id === id);

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
  // The block starts the week training really starts, however long the app sat unused before.
  if (state.settings.startAuto && r.length) {
    const earlier = Object.values(state.logs).some((x) => x.history.some((h) => h.d < today()));
    if (!earlier) state.settings.startDate = L.startForWeek(1, today());
    state.settings.startAuto = false;
    await S.set("settings", state.settings);
    renderWeeks();
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
  timerPad(true);
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
$("timerStop").onclick = () => { clearInterval(timerTick); $("timer").hidden = true; timerPad(false); };
// Reserve room under the page for the fixed timer bar so it never covers the last buttons.
function timerPad(on) {
  document.body.classList.toggle("timing", on);
  document.documentElement.style.setProperty("--timer-h", on ? $("timer").offsetHeight + "px" : "0px");
  const el = document.activeElement;
  if (on && el && el.getBoundingClientRect().bottom > innerHeight - $("timer").offsetHeight) el.scrollIntoView({ block: "center" });
}

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

const bulkMode = () => L.BULK[state.settings.bulk] || L.BULK.lean;

// Reasons to step back from Size to Lean. Sexual health outranks speed of gain.
function bulkGuard() {
  const out = [];
  const sh = L.sexHealth(state.checkins, today());
  if (sh.status === "bad") out.push("check-in 14 วันบอกว่าอารมณ์ทางเพศ/การแข็งตัวตอนเช้าลดลงชัด");
  else if (sh.status === "watch") out.push("การแข็งตัวตอนเช้าเริ่มลดลง");
  if (cutOne()) out.push("ฟื้นตัวไม่ทัน 3 วันติด");
  const w = L.measureRate(state.measures, "waist");
  if (L.waistTooFast(w)) out.push(`เอวขยาย ${w.per4w} cm ต่อ 4 สัปดาห์ (เกิน 1.5)`);
  return out;
}

const findFood = (id) => state.myfoods.find((f) => f.id === id) || builtinFood(id);
const UNITS = ["g", "ml", "ถุง", "ซอง", "ชิ้น", "แผ่น", "กล่อง", "ขวด", "ถ้วย", "จาน", "ลูก", "ฟอง"];
const NA_MAX = 2000; // WHO daily sodium limit, mg
let myDelArm = null;

async function addFood(entry) {
  const d = today();
  state.food[d] = (state.food[d] || []).concat({ id: uid(), ...entry });
  await S.set("food", state.food);
  renderFood();
}

// `min` turns the goal into a range: anything from min up to goal counts as on target.
function bar(label, have, goal, unit, min) {
  const pct = goal ? Math.min(100, (have / goal) * 100) : 0;
  const over = goal && have > goal * 1.1;
  return `<div class="macro"><div class="macro-h"><span class="label">${label}</span>
    <span class="mono">${Math.round(have)} / ${min ? `${min}–` : ""}${goal} ${unit}${min && have >= min ? " ✓" : ""}</span></div>
    <div class="dp-bar"><i style="width:${pct}%;${over ? "background:var(--warn)" : ""}"></i></div></div>`;
}

// Today's calorie and macro targets, or null until the birth date is set.
function targetsNow() {
  const s = state.settings, age = s.dob ? L.ageOn(s.dob, today()) : s.age;
  const act = L.ACTIVITY[s.activity] || L.ACTIVITY.mid;
  return age ? L.targets(currentKg().kg, s.height || 183, age, bulkMode().surplus, act.f) : null;
}

function renderFood() {
  const d = today(), s = state.settings;
  const { kg, src } = currentKg();
  const cm = s.height || 183;
  const age = s.dob ? L.ageOn(s.dob, d) : s.age;
  const mode = bulkMode();
  const act = L.ACTIVITY[s.activity] || L.ACTIVITY.mid;
  const tg = targetsNow();
  const entries = state.food[d] || [];
  const tot = L.dayTotals(entries);
  const naKnown = entries.filter((e) => e.na != null);
  const na = naKnown.reduce((a, e) => a + e.na, 0);
  const meals = L.groupMeals(entries);
  const trend = L.bodyTrend(state.body, d, mode.range).verdict;
  const trendTip = { slow: "น้ำหนักขึ้นช้ากว่าเป้า ถ้าเป็นแบบนี้ 2 สัปดาห์ติด เพิ่มอีก 150–200 kcal", fast: "น้ำหนักขึ้นเร็วเกินเป้า ลดลง 150 kcal", ok: "น้ำหนักขึ้นตรงเป้า กินเท่านี้ต่อ" }[trend];
  const guard = bulkGuard();
  const pMin = tg?.pMin ?? 123, fMin = tg?.fMin ?? 62;
  const lowFat = L.lowStreak(state.food, d, "f", fMin);
  const lowP = L.lowStreak(state.food, d, "p", pMin);

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
        <div class="seg" role="group" aria-label="โหมด bulk">
          ${Object.entries(L.BULK).map(([k, b]) => `<button id="bulk-${k}" data-bulk="${k}" aria-pressed="${b === mode}">${b.name} +${b.surplus}</button>`).join("")}
        </div>
        <span class="label" style="display:block;margin-top:10px">นอกเวลาซ้อม ขยับตัวแค่ไหน</span>
        <div class="seg" role="group" aria-label="ระดับกิจกรรม">
          ${Object.entries(L.ACTIVITY).map(([k, a]) => `<button data-act="${k}" aria-pressed="${a === act}">${a.name}</button>`).join("")}
        </div>
        <p class="note">${act.desc} · ไม่แน่ใจให้เลือกขยับน้อยไว้ก่อน แล้วดูน้ำหนักตัว 2 สัปดาห์</p>
        <p class="note">${mode === L.BULK.size
          ? `Size: น้ำหนักขึ้น ${mode.range[0]}–${mode.range[1]} kg/สัปดาห์ ตัวใหญ่เร็วกว่า แต่ไขมันขึ้นด้วย แอปเฝ้าเอวและ check-in เรื่องเพศไว้ให้`
          : `Lean: น้ำหนักขึ้น ${mode.range[0]}–${mode.range[1]} kg/สัปดาห์ ไขมันขึ้นน้อย เหมาะกับช่วง Re-entry`}</p>
        ${mode === L.BULK.size && week() <= 2 ? `<div class="banner"><b>ยังอยู่ช่วง Re-entry</b> ซ้อมเบาอยู่ ส่วนเกินที่มากขึ้นจะกลายเป็นไขมันมากกว่า แนะนำให้เริ่ม Size ตั้งแต่สัปดาห์ 3</div>` : ""}
        ${mode === L.BULK.size && guard.length ? `<div class="banner bad"><b>ควรกลับไปโหมด Lean</b> ${guard.join(" · ")}</div>` : ""}
        ${tg ? `<div class="big">${tg.kcal.toLocaleString()} kcal</div>
          <p class="mono">โปรตีน ${tg.pMin}–${tg.p} g · คาร์บ ${tg.cMin}–${tg.c} g · ไขมัน ${tg.fMin}–${tg.f} g</p>
          <p class="note">ใช้น้ำหนัก ${kg.toFixed(1)} kg (${src}) · ใช้พลังงานต่อวัน ~${tg.tdee.toLocaleString()} kcal + ส่วนเกิน ${mode.surplus} kcal สำหรับสร้างกล้าม</p>
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
        ${bar("โปรตีน", tot.p, tg?.p ?? 154, "g", tg?.pMin ?? 123)}
        ${bar("คาร์บ", tot.c, tg?.c ?? 400, "g", tg?.cMin ?? 230)}
        ${bar("ไขมัน", tot.f, tg?.f ?? 77, "g", tg?.fMin ?? 62)}
      </div>
      ${naKnown.length ? `<p class="mono${na > NA_MAX ? " err" : ""}">โซเดียม ${na.toLocaleString()} / ${NA_MAX.toLocaleString()} mg${naKnown.length < entries.length ? ` <span class="note">(นับเฉพาะ ${naKnown.length} รายการที่รู้ค่า)</span>` : ""}</p>` : ""}
      ${na > NA_MAX ? `<div class="banner"><b>เค็มเกินวันละ ${NA_MAX.toLocaleString()} mg</b> ดื่มน้ำเพิ่ม มื้อที่เหลือเลือกของไม่ปรุงรส ถ้าเค็มแบบนี้ทุกวัน ความดันขึ้นซึ่งกระทบหลอดเลือดและการแข็งตัว</div>` : ""}
      <p class="note">ตัวเลขแรกคือขั้นต่ำ ถึงแล้วพอ คาร์บกับไขมันแลกกันได้ (ไขมัน 1 g ≈ คาร์บ 2.25 g) พลังงานดูเฉลี่ยทั้งสัปดาห์จากกราฟน้ำหนักตัว</p>
      ${lowFat >= 3 ? `<div class="banner bad"><b>ไขมันต่ำ ${lowFat} วันติด</b> ต่ำกว่า ${fMin} g ต่อวันนานๆ กดฮอร์โมนเพศชาย เพิ่มไข่ทั้งฟอง โยเกิร์ต หรือหมูติดมันในมื้อที่ไม่ใช่ก่อนซ้อม</div>` : ""}
      ${lowP >= 3 ? `<div class="banner"><b>โปรตีนต่ำ ${lowP} วันติด</b> ต่ำกว่า ${pMin} g กล้ามจะโตช้าลง เพิ่มอกไก่ 1–2 ซองหรือไข่ 2–3 ฟอง</div>` : ""}
      ${meals.length ? meals.map((m) => `<div class="meal"><div class="meal-h"><b class="mono">${m.t}</b><span class="mono">${m.kcal} kcal · P${Math.round(m.p)} C${Math.round(m.c)} F${Math.round(m.f)}</span></div>
        ${m.items.map((e) => `<div class="fitem"><span>${esc(e.n)} <span class="mono">${e.qty} ${esc(e.unit)}</span></span><span class="mono">${e.kcal}</span>
          <button class="x" data-del="${e.id}" aria-label="ลบ ${esc(e.n)}">×</button></div>`).join("")}</div>`).join("")
        : `<p class="note">ยังไม่มีรายการ เพิ่มอาหารด้านล่าง</p>`}
    </div>

    <div class="card">
      <h3>เพิ่มอาหาร</h3>
      <div class="field">
        <select id="fsel" aria-label="อาหาร">
          ${state.myfoods.length ? `<optgroup label="อาหารของฉัน">${state.myfoods.map((f) => `<option value="${f.id}">${esc(f.n)}</option>`).join("")}</optgroup>` : ""}
          <optgroup label="รายการในแอป">${FOODS.map((f) => `<option value="${f.id}">${esc(f.n)}</option>`).join("")}</optgroup>
        </select>
      </div>
      <div class="seg" id="fmode" role="group" aria-label="ใส่ปริมาณเป็น">
        <button data-fmode="g" aria-pressed="false">กรัม</button><button data-fmode="pc" aria-pressed="false" id="fmodePc">หน่วย</button>
      </div>
      <div class="field">
        <input type="number" id="fqty" min="0" step="any" inputmode="decimal" aria-label="ปริมาณ"><span id="funit"></span>
        <input type="time" id="ftime" value="${nowHM()}" aria-label="เวลาที่กิน">
        <button class="btn" id="fadd">เพิ่ม</button>
      </div>
      <p class="note mono" id="fprev"></p>
      ${recent.length ? `<div><span class="label">กินบ่อย แตะเพื่อเพิ่มตอนนี้</span><div class="chips">${recent.map((e, i) => `<button class="chipbtn" data-recent="${i}">${esc(e.n)} ${e.qty} ${esc(e.unit)}</button>`).join("")}</div></div>` : ""}
      <details class="hist" id="myBox"${state.myOpen ? " open" : ""}><summary>เพิ่มอาหารของฉัน (จากฉลาก)</summary>
        <p class="note">ดูตาราง "ข้อมูลโภชนาการ" บนซอง กรอกค่าต่อหนึ่งหน่วยบริโภค เช่น 1 ถุง หรือ 100 g ชื่อซ้ำกับของเดิมจะทับค่าเดิม</p>
        <div class="field"><input id="cn" placeholder="ชื่ออาหาร เช่น ขนมจีบกุ้ง เซเว่น" aria-label="ชื่ออาหาร" style="width:100%"></div>
        <div class="field"><label for="cper">ค่าต่อ</label><input type="number" id="cper" min="0" step="any" inputmode="decimal" value="100" aria-label="ปริมาณต่อหน่วยบริโภค">
          <select id="cunit" aria-label="หน่วย" style="width:auto">${UNITS.map((u) => `<option>${u}</option>`).join("")}</select></div>
        <div class="field">
          <input type="number" id="ck" placeholder="kcal" aria-label="kcal" inputmode="decimal">
          <input type="number" id="cp" placeholder="โปรตีน g" aria-label="โปรตีน g" inputmode="decimal">
          <input type="number" id="cc" placeholder="คาร์บ g" aria-label="คาร์บ g" inputmode="decimal">
          <input type="number" id="cf" placeholder="ไขมัน g" aria-label="ไขมัน g" inputmode="decimal">
          <input type="number" id="cna" placeholder="โซเดียม mg" aria-label="โซเดียม mg (ไม่บังคับ)" inputmode="numeric">
        </div>
        <div class="row-actions"><button class="btn" id="csave">บันทึกเข้ารายการ</button><button class="btn ghost" id="cadd">กินครั้งเดียว ไม่บันทึก</button><span id="cerr" class="err"></span></div>
        ${state.myfoods.length ? `<div class="myfoods"><span class="label">อาหารของฉัน ${state.myfoods.length} รายการ</span>${state.myfoods.map((f) => `<div class="fitem"><span>${esc(f.n)} <span class="mono">${f.per} ${esc(f.unit)} · ${f.k} kcal · P${f.p}${f.na != null ? ` · Na ${f.na}` : ""}</span></span>
          <button class="x${myDelArm === f.id ? " armed" : ""}" data-mydel="${f.id}" aria-label="ลบ ${esc(f.n)}">${myDelArm === f.id ? "ลบ?" : "×"}</button></div>`).join("")}</div>` : ""}
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
  // Grams or pieces: one global preference; foods without a piece size always use their own unit.
  const modeFor = (f) => (f.pc && s.foodMode === "pc" ? "pc" : "g");
  const unitFor = (f) => (modeFor(f) === "pc" ? f.pc[0] : f.unit);
  const syncFood = (resetQty) => {
    const f = findFood(fsel.value), mode = modeFor(f);
    if (resetQty) fqty.value = mode === "pc" ? Math.max(1, Math.round(f.def / f.pc[1])) : f.def;
    $("funit").textContent = unitFor(f);
    $("fmode").hidden = !f.pc;
    if (f.pc) $("fmodePc").textContent = `${f.pc[0]} (~${f.pc[1]} ${f.unit})`;
    document.querySelectorAll("[data-fmode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fmode === mode)));
    const q = Number(fqty.value) || 0;
    const v = portion(f, baseQty(f, q, mode));
    $("fprev").textContent = `${mode === "pc" ? `≈ ${Math.round(baseQty(f, q, mode))} ${f.unit} · ` : ""}${v.kcal} kcal · โปรตีน ${v.p} g · คาร์บ ${v.c} g · ไขมัน ${v.f} g${v.na != null ? ` · โซเดียม ${v.na} mg` : ""}`;
  };
  document.querySelectorAll("[data-fmode]").forEach((b) => b.onclick = async () => {
    const f = findFood(fsel.value), from = modeFor(f), q = Number(fqty.value) || 0;
    state.settings.foodMode = b.dataset.fmode;
    await S.set("settings", state.settings);
    const to = modeFor(f);
    if (from !== to && f.pc) fqty.value = to === "pc" ? Math.round((q / f.pc[1]) * 2) / 2 || 1 : Math.round(q * f.pc[1]);
    syncFood(false);
  });
  if (s.lastFood && findFood(s.lastFood)) fsel.value = s.lastFood;
  syncFood(true);
  fsel.onchange = () => syncFood(true);
  fqty.oninput = () => syncFood(false);
  $("fadd").onclick = async () => {
    const f = findFood(fsel.value), q = Number(fqty.value);
    if (!q || q <= 0) { $("fprev").textContent = "กรอกปริมาณมากกว่า 0"; return; }
    state.settings.lastFood = f.id;
    await S.set("settings", state.settings);
    await addFood({ t: $("ftime").value || nowHM(), n: f.n, qty: q, unit: unitFor(f), fid: f.id, ...portion(f, baseQty(f, q, modeFor(f))) });
  };
  document.querySelectorAll("[data-recent]").forEach((b) => b.onclick = () => {
    const e = recent[+b.dataset.recent];
    addFood({ t: nowHM(), n: e.n, qty: e.qty, unit: e.unit, fid: e.fid, kcal: e.kcal, p: e.p, c: e.c, f: e.f, ...(e.na != null && { na: e.na }) });
  });
  document.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    state.food[d] = (state.food[d] || []).filter((e) => e.id !== b.dataset.del);
    await S.set("food", state.food);
    renderFood();
  });
  $("myBox").ontoggle = () => { state.myOpen = $("myBox").open; };
  const readMine = () => {
    const n = $("cn").value.trim(), k = Number($("ck").value), per = Number($("cper").value);
    if (!n || !(k > 0) || !(per > 0)) { $("cerr").textContent = "ใส่ชื่อ ปริมาณ และ kcal อย่างน้อย"; return null; }
    const num = (id) => Math.max(0, Number($(id).value) || 0);
    const f = { n, unit: $("cunit").value, per, def: per, k: Math.round(k), p: num("cp"), c: num("cc"), f: num("cf") };
    if ((f.unit === "g" || f.unit === "ml") && per !== 100) f.pc = ["หน่วยบริโภค", per];
    if ($("cna").value !== "") f.na = Math.round(num("cna"));
    return f;
  };
  $("csave").onclick = async () => {
    const f = readMine();
    if (!f) return;
    const same = state.myfoods.find((x) => x.n.toLowerCase() === f.n.toLowerCase());
    f.id = same?.id || "my_" + uid();
    state.myfoods = state.myfoods.filter((x) => x.id !== f.id).concat(f);
    await S.set("myfoods", state.myfoods);
    state.settings.lastFood = f.id;
    await S.set("settings", state.settings);
    renderFood();
    $("fprev").textContent = `บันทึก "${f.n}" แล้ว เลือกไว้ให้ด้านบน กรอกปริมาณแล้วกดเพิ่ม`;
  };
  $("cadd").onclick = () => {
    const f = readMine();
    if (!f) return;
    addFood({ t: $("ftime").value || nowHM(), n: f.n, qty: f.per, unit: f.unit, ...portion(f, f.per) });
  };
  document.querySelectorAll("[data-mydel]").forEach((b) => b.onclick = async () => {
    const id = b.dataset.mydel;
    if (myDelArm !== id) { myDelArm = id; renderFood(); return; }
    myDelArm = null;
    state.myfoods = state.myfoods.filter((f) => f.id !== id);
    await S.set("myfoods", state.myfoods);
    renderFood();
  });
  const saveProfile = async () => {
    const dob = $("dob").value, h = Number($("height").value);
    const a = dob ? L.ageOn(dob, d) : 0;
    state.settings.dob = a >= 15 && a <= 80 ? dob : undefined;
    state.settings.height = h >= 140 && h <= 220 ? h : 183;
    await S.set("settings", state.settings);
    renderFood();
  };
  $("dob").onchange = saveProfile;
  document.querySelectorAll("[data-act]").forEach((b) => b.onclick = async () => {
    state.settings.activity = b.dataset.act;
    await S.set("settings", state.settings);
    renderFood();
  });
  document.querySelectorAll("[data-bulk]").forEach((b) => b.onclick = async () => {
    state.settings.bulk = b.dataset.bulk;
    await S.set("settings", state.settings);
    renderFood();
  });
  $("height").onchange = saveProfile;
}

/* ---------------- calendar ---------------- */
const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const dowOf = (d) => new Date(d + "T12:00:00").getDay();
const exName = (id) => DAYS.flatMap((x) => x.ex).find((e) => e.id === id)?.n || altName(id) || id;

// Everything the calendar shows for one date.
function dayInfo(d, tg) {
  const plan = DAYS.find((x) => x.dow === dowOf(d));
  const base = plan.ex.filter((e) => e.log !== false);
  const ids = (e) => [e.id, ...(SWAPS[e.id] || [])];
  const doneEx = base.filter((e) => ids(e).some((id) => hist(id).some((h) => h.d === d)));
  const lifts = Object.entries(state.logs).flatMap(([id, r]) => r.history.filter((h) => h.d === d).map((h) => ({ id, ...h })));
  const cardio = (state.done[d] || []).filter((id) => DAYS.some((x) => x.ex.some((e) => e.id === id && e.cardio)));
  const food = state.food[d] || [];
  const tot = food.length ? L.dayTotals(food) : null;
  const foodOk = tot && tg ? tot.p >= tg.pMin && tot.kcal >= tg.kcal * 0.85 : null;
  const ci = state.checkins[d];
  const ciCls = !ci ? null : L.redDay(ci) ? "r" : L.SIGNS.some((s) => ci[s.k]) ? "y" : "g";
  return { d, plan, ratio: base.length ? doneEx.length / base.length : 0, lifts, cardio, tot, foodOk, ci, ciCls,
    kg: state.body.find((e) => e.d === d)?.kg, sex: state.sex[d], photos: (state.photos || []).filter((p) => p.d === d).length,
    measure: state.measures.find((m) => m.d === d) };
}

function plateRing(info) {
  if (!info.lifts.length) return "";
  const r = Math.max(0.08, info.ratio);
  return `<svg class="cal-plate" viewBox="0 0 24 24" style="--pc:var(${info.plan.pc})" aria-hidden="true">
    <circle class="trk" cx="12" cy="12" r="9"/><circle class="arc" cx="12" cy="12" r="9" pathLength="1" style="stroke-dasharray:${r.toFixed(3)} 1"/>
    <text x="12" y="15.5" text-anchor="middle">${info.plan.code}</text></svg>`;
}

function renderCal() {
  const t = today(), tg = targetsNow();
  const month = state.calMonth || t.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const start = L.mondayOf(first);
  const sel = state.calSel && state.calSel.startsWith(month) ? state.calSel : t.startsWith(month) ? t : first;
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = L.addDays(start, i);
    if (i >= 35 && !d.startsWith(month)) break;
    cells.push(d);
  }
  const inMonth = cells.filter((d) => d.startsWith(month) && d <= t).map((d) => dayInfo(d, tg));
  const trained = inMonth.filter((x) => x.lifts.length).length;
  const cardioN = inMonth.filter((x) => x.cardio.length).length;
  const foodLogged = inMonth.filter((x) => x.tot), foodOk = foodLogged.filter((x) => x.foodOk).length;
  const sleeps = inMonth.map((x) => x.ci?.sleepH).filter((h) => h != null);
  const kgs = inMonth.filter((x) => x.kg != null);
  const fmtK = (v) => (v > 0 ? "+" : "") + v.toFixed(1);

  const cell = (d, i) => {
    const out = !d.startsWith(month), future = d > t;
    if (out) return `<span class="cal-d out"></span>`;
    const x = dayInfo(d, tg);
    return `<button class="cal-d${d === t ? " today" : ""}${d === sel ? " sel" : ""}${future ? " future" : ""}" data-cal="${d}" style="--i:${i}" aria-label="${+d.slice(8)} ${TH_MONTH[m - 1]}">
      <span class="cal-n">${+d.slice(8)}</span>
      ${plateRing(x) || (x.plan.ex.length ? `<span class="cal-rest"></span>` : `<span class="cal-rest">พัก</span>`)}
      <span class="cal-ic">${x.tot ? `<span class="ic ${x.foodOk ? "ok" : "low"}">${ICON.food}</span>` : ""}${x.cardio.length ? `<span class="ic heart">${ICON.heart}</span>` : ""}${x.ciCls ? `<i class="dot ${x.ciCls}"></i>` : ""}</span>
      ${x.kg != null ? `<span class="cal-w">${x.kg.toFixed(1)}</span>` : ""}
    </button>`;
  };

  const x = dayInfo(sel, tg);
  const dt = new Date(sel + "T12:00:00");
  const detail = `<div class="card cal-detail" id="calDetail">
    <h3>${dt.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}</h3>
    <p class="label">${esc(x.plan.title)}${sel > t ? " · ยังไม่ถึง" : ""}</p>
    ${x.lifts.length ? `<div class="cal-sec"><b>ซ้อม ${Math.round(x.ratio * 100)}%</b>${x.lifts.map((h) => `<div class="fitem"><span>${esc(exName(h.id))}</span><span class="mono">${h.w.map((w, k) => w + "×" + h.r[k]).join(" ")}</span></div>`).join("")}</div>` : sel <= t && x.plan.ex.length ? `<p class="note">ไม่ได้บันทึกการซ้อม</p>` : ""}
    ${x.cardio.length ? `<div class="cal-sec"><b>คาร์ดิโอ</b> ${x.cardio.map((id) => esc(exName(id))).join(", ")} ✓</div>` : ""}
    ${x.tot ? `<div class="cal-sec"><b>อาหาร ${x.foodOk ? "ครบ" : "ยังไม่ถึงเป้า"}</b><p class="mono">${x.tot.kcal.toLocaleString()}${tg ? ` / ${tg.kcal.toLocaleString()}` : ""} kcal · P${Math.round(x.tot.p)}${tg ? `/${tg.pMin}` : ""} · C${Math.round(x.tot.c)} · F${Math.round(x.tot.f)}${tg ? `/${tg.fMin}` : ""}</p></div>` : ""}
    ${x.ci ? `<div class="cal-sec"><b>Check-in</b> <i class="dot ${x.ciCls}"></i> ${x.ci.sleepH != null ? `นอน ${x.ci.sleepH} ชม. · ` : ""}${L.SIGNS.filter((s) => x.ci[s.k]).map((s) => esc(s.t)).join(" · ") || "ปกติ"}</div>` : ""}
    ${x.sex ? `<div class="cal-sec"><b>เซ็กส์</b> แข็งตัว ${x.sex.erect}/5 · อึด ${x.sex.stamina}/5</div>` : ""}
    ${x.kg != null || x.measure ? `<div class="cal-sec"><b>ร่างกาย</b> ${x.kg != null ? `${x.kg.toFixed(1)} kg` : ""}${x.measure ? ` · แขน ${x.measure.arm ?? "-"} อก ${x.measure.chest ?? "-"} เอว ${x.measure.waist ?? "-"} cm` : ""}</div>` : ""}
    ${x.photos ? `<div class="cal-sec"><b>รูปความคืบหน้า</b> ${x.photos} รูป</div>` : ""}
    ${!x.lifts.length && !x.tot && !x.ci && x.kg == null && sel <= t ? `<p class="note">วันนี้ยังไม่มีบันทึก</p>` : ""}
  </div>`;

  $("p-cal").innerHTML = `
    <div class="cal-head">
      <button class="btn ghost" id="calPrev" aria-label="เดือนก่อน">‹</button>
      <h2>${TH_MONTH[m - 1]} ${y + 543}</h2>
      <button class="btn ghost" id="calNext" aria-label="เดือนถัดไป">›</button>
    </div>
    <div class="cal-sum">
      <div><b>${trained}</b><span>วันซ้อม</span></div>
      <div><b>${cardioN}</b><span>คาร์ดิโอ</span></div>
      <div><b>${foodOk}/${foodLogged.length}</b><span>กินครบ</span></div>
      <div><b>${sleeps.length ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : "-"}</b><span>นอนเฉลี่ย</span></div>
      <div><b>${kgs.length >= 2 ? fmtK(kgs[kgs.length - 1].kg - kgs[0].kg) : "-"}</b><span>kg เดือนนี้</span></div>
    </div>
    <div class="cal-grid">
      ${["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((h) => `<span class="cal-h">${h}</span>`).join("")}
      ${cells.map(cell).join("")}
    </div>
    <div class="cal-legend">
      <span>${plateRing({ lifts: [1], ratio: 0.7, plan: DAYS[0] })} ซ้อม (วงเต็ม = ครบทุกท่า)</span>
      <span><span class="ic ok">${ICON.food}</span> กินครบ</span><span><span class="ic low">${ICON.food}</span> ยังไม่ถึง</span>
      <span><span class="ic heart">${ICON.heart}</span> คาร์ดิโอ</span>
      <span><i class="dot g"></i><i class="dot y"></i><i class="dot r"></i> check-in</span>
      <span class="mono">77.4</span><span>น้ำหนัก</span>
    </div>
    ${detail}`;
  document.querySelectorAll("[data-cal]").forEach((b) => b.onclick = () => {
    state.calSel = b.dataset.cal;
    renderCal();
    $("calDetail").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  const shift = (k) => {
    const nd = new Date(y, m - 1 + k, 1);
    state.calMonth = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`;
    renderCal();
  };
  $("calPrev").onclick = () => shift(-1);
  $("calNext").onclick = () => shift(1);
}

/* ---------------- goals ---------------- */
// Lift goals are working weight for 8 clean reps. Machine numbers differ between gyms, so all are editable.
const GOAL_LIFTS = [
  { id: "incl_mach", n: "Multi Press · Incline", def: 70 },
  { id: "flat_db", n: "Flat DB Press (ต่อข้าง)", def: 32 },
  { id: "lat_pd", n: "Machine Lat Pulldown", def: 75 },
  { id: "smith_squat", n: "Smith Machine Squat", def: 90 },
];

function bodyChart(goal) {
  const t = today();
  const from = L.addDays(t, -90);
  const pts = state.body.filter((e) => e.d > from);
  if (pts.length < 2) return `<p class="note">ชั่งน้ำหนักในแท็บน้ำหนักตัวอย่างน้อย 2 วัน กราฟจะขึ้นตรงนี้</p>`;
  const W = 360, H = 180, padL = 30, padR = 8, padT = 16, padB = 22;
  const x0 = Date.parse(pts[0].d), x1 = Math.max(Date.parse(pts[pts.length - 1].d), x0 + 864e5 * 7);
  const vals = pts.map((e) => e.kg);
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(goal, ...vals) + 0.5);
  const X = (d) => padL + ((Date.parse(d) - x0) / (x1 - x0)) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  // 7-day rolling average
  const avg = pts.map((e) => {
    const win = pts.filter((q) => q.d > L.addDays(e.d, -7) && q.d <= e.d).map((q) => q.kg);
    return [X(e.d), Y(win.reduce((a, b) => a + b, 0) / win.length)];
  });
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="น้ำหนักตัว 90 วันล่าสุด เทียบเป้า ${goal} kg">
    ${ticks.map((v) => `<line x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" class="axis">${v}</text>`).join("")}
    <line x1="${padL}" x2="${W - padR}" y1="${Y(goal)}" y2="${Y(goal)}" class="goal"/>
    <text x="${W - padR}" y="${Y(goal) - 6}" text-anchor="end" class="goaltxt">เป้า ${goal} kg</text>
    ${pts.map((e) => `<circle cx="${X(e.d).toFixed(1)}" cy="${Y(e.kg).toFixed(1)}" r="2.5" class="pt"/>`).join("")}
    <polyline class="avg ln" pathLength="1" points="${avg.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ")}"/>
    <text x="${padL}" y="${H - 6}" class="axis">${fmtDate(pts[0].d)}</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" class="axis">${fmtDate(pts[pts.length - 1].d)}</text>
  </svg></div>`;
}

function renderGoals() {
  const t = today(), s = state.settings;
  const g = s.goals || {};
  const goalKg = g.bodyKg || 85;
  const { kg, src } = currentKg();
  const slope = L.slopePerWeek(state.body, t);
  const eta = L.etaWeeks(kg, goalKg, slope);
  const etaDate = eta ? new Date(Date.now() + eta * 7 * 864e5).toLocaleDateString("th-TH", { month: "short", year: "numeric" }) : null;
  const sh = L.sexHealth(state.checkins, t);
  const mode = bulkMode();
  const guard = bulkGuard();
  const arm = L.measureRate(state.measures, "arm"), chest = L.measureRate(state.measures, "chest"), waist = L.measureRate(state.measures, "waist");
  const mToday = state.measures.find((m) => m.d === t) || {};
  const rate = (r) => (r ? `<span class="mono">${r.per4w >= 0 ? "+" : ""}${r.per4w} cm/4 สัปดาห์</span>` : `<span class="note">ต้องวัดห่างกัน 3 สัปดาห์ขึ้นไป</span>`);
  const shTag = { good: ["ปกติดี", "up"], watch: ["เริ่มลดลง", "hold"], bad: ["ลดลงชัด", "down"] }[sh.status];

  $("p-goals").innerHTML = `
    <h2>เป้าหมาย</h2>

    <div class="card sexcard">
      <h3>สมรรถภาพทางเพศ 14 วัน</h3>
      ${sh.status
        ? `<p><span class="tag ${shTag[1]}">${shTag[0]}</span> แข็งตัวตอนเช้า <span class="mono">${sh.logged - sh.noMorning}/${sh.logged}</span> วัน · อารมณ์ลด <span class="mono">${sh.lowLibido}</span> วัน</p>`
        : `<p class="note">ทำ Check-in ตอนเช้าอีก ${5 - sh.logged} วัน แอปถึงจะสรุปได้ (บันทึกแล้ว ${sh.logged} วัน)</p>`}
      <p class="note">ตัวนี้มาก่อนเป้าตัวใหญ่ทุกข้อ ถ้าเริ่มลดลง: กลับโหมด Lean, นอนให้ถึง 8 ชม., ตรวจว่ากินถึงเป้าและไขมันไม่ต่ำกว่า 60 g/วัน ไม่ดีขึ้นใน 2 สัปดาห์ ตรวจเลือดดู testosterone ตอนเช้า</p>
      ${mode === L.BULK.size && guard.length ? `<div class="banner bad"><b>ควรกลับไปโหมด Lean</b> ${guard.join(" · ")}</div>` : ""}
    </div>

    <div class="grid2">
      <div class="card">
        <h3>น้ำหนักตัวเป้าหมาย</h3>
        <div class="field"><label for="goalKg">เป้า</label><input type="number" id="goalKg" step="0.5" min="60" max="130" value="${goalKg}"><span>kg</span></div>
        <div class="big">${kg.toFixed(1)} <span class="unit">/ ${goalKg} kg</span></div>
        <div class="dp-bar"><i style="width:${Math.max(0, Math.min(100, ((kg - 77) / Math.max(0.1, goalKg - 77)) * 100))}%"></i></div>
        <p class="note">${src} · เริ่มที่ 77 kg · โหมด ${mode.name}</p>
        <p>${eta === 0 ? `<span class="tag up">ถึงเป้าแล้ว</span>`
          : eta ? `ขึ้นอยู่ <span class="mono">${slope >= 0 ? "+" : ""}${slope.toFixed(2)} kg/สัปดาห์</span> → ถึงเป้าในราว <b>${eta} สัปดาห์</b> (${etaDate})`
          : slope != null ? `น้ำหนักยังไม่ขึ้น <span class="mono">${slope.toFixed(2)} kg/สัปดาห์</span> ต้องกินเพิ่ม`
          : `ชั่งทุกเช้าให้ครบ 2 สัปดาห์ แอปจะคาดว่าถึงเป้าเมื่อไร`}</p>
      </div>
      <div class="card">
        <h3>กราฟ 90 วัน</h3>
        ${bodyChart(goalKg)}
      </div>
    </div>

    <div class="card">
      <h3>เป้าแรง (น้ำหนัก × 8 ครั้ง)</h3>
      <p class="note">เทียบด้วย e1RM (แรงสูงสุด 1 ครั้งโดยประมาณ) จากเซ็ตที่ดีที่สุดที่บันทึกไว้ ตัวเลขเริ่มต้นเป็นเป้า 6 เดือน แก้ให้ตรงกับเครื่องที่ยิมได้</p>
      <div class="lifts">${GOAL_LIFTS.map((x) => {
        const goal = g.lifts?.[x.id] ?? x.def;
        const best = L.bestLift(hist(x.id));
        const tgt = L.goalE1rm(goal);
        const pct = best ? Math.min(100, (best.e1rm / tgt) * 100) : 0;
        return `<div class="lift">
          <div class="macro-h"><b>${esc(x.n)}</b><span class="field"><input type="number" id="lg_${x.id}" data-lift="${x.id}" step="0.5" min="0" value="${goal}" aria-label="เป้า ${esc(x.n)} kg"><span>kg × 8</span></span></div>
          <div class="dp-bar"><i style="width:${pct}%;${pct >= 100 ? "background:var(--good)" : ""}"></i></div>
          <span class="note mono">${best ? `ดีสุด ${best.w}×${best.r} (${fmtDate(best.d)}) · ${Math.round(pct)}%` : "ยังไม่มีบันทึก"}</span>
        </div>`;
      }).join("")}</div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>วัดรอบตัว</h3>
        <p class="note">เดือนละครั้ง ตอนเช้าก่อนกิน วัดจุดเดิมทุกครั้ง แขน: เกร็งรอบที่ใหญ่สุด · อก: แนวหัวนม หายใจออกปกติ · เอว: แนวสะดือ ไม่แขม่ว</p>
        <div class="field"><label for="mArm">แขน</label><input type="number" id="mArm" step="0.1" value="${mToday.arm ?? ""}"><span>cm</span></div>
        <div class="field"><label for="mChest">อก</label><input type="number" id="mChest" step="0.1" value="${mToday.chest ?? ""}"><span>cm</span></div>
        <div class="field"><label for="mWaist">เอว</label><input type="number" id="mWaist" step="0.1" value="${mToday.waist ?? ""}"><span>cm</span></div>
        <div class="row-actions"><button class="btn" id="mSave">บันทึกวันนี้</button><span id="mOk" class="saved"></span></div>
      </div>
      <div class="card">
        <h3>กำลังได้กล้ามหรือไขมัน</h3>
        <div class="tbl"><table>
          <tr><th>รอบ</th><th>ล่าสุด</th><th>อัตรา</th></tr>
          ${[["แขน", "arm", arm], ["อก", "chest", chest], ["เอว", "waist", waist]].map(([n, k, r]) => {
            const last = state.measures.filter((m) => m[k] > 0).slice(-1)[0];
            return `<tr><td>${n}</td><td class="num">${last ? last[k] + " cm" : "–"}</td><td>${rate(r)}</td></tr>`;
          }).join("")}
        </table></div>
        <p class="note">แขนกับอกขึ้น เอวขึ้นไม่เกิน 1 cm/เดือน = ได้กล้ามเป็นหลัก ถ้าเอวขึ้นเกิน 1.5 cm/4 สัปดาห์ ไขมันขึ้นเร็วเกิน ซึ่งกดฮอร์โมนเพศชายได้ ให้ลดลงมาโหมด Lean</p>
      </div>
    </div>
    ${photosHtml()}`;
  wirePhotos();

  $("goalKg").onchange = async () => {
    const v = Number($("goalKg").value);
    if (v >= 60 && v <= 130) { state.settings.goals = { ...g, bodyKg: v }; await S.set("settings", state.settings); }
    renderGoals();
  };
  document.querySelectorAll("[data-lift]").forEach((inp) => inp.onchange = async () => {
    const v = Number(inp.value);
    const lifts = { ...(state.settings.goals?.lifts || {}) };
    if (v > 0) lifts[inp.dataset.lift] = v; else delete lifts[inp.dataset.lift];
    state.settings.goals = { ...(state.settings.goals || {}), lifts };
    await S.set("settings", state.settings);
    renderGoals();
  });
  $("mSave").onclick = async () => {
    const val = (id) => { const v = Number($(id).value); return v > 0 && v < 250 ? v : undefined; };
    const m = { d: t, arm: val("mArm"), chest: val("mChest"), waist: val("mWaist") };
    if (!m.arm && !m.chest && !m.waist) { $("mOk").className = "err"; $("mOk").textContent = "กรอกอย่างน้อย 1 ช่อง"; return; }
    state.measures = state.measures.filter((x) => x.d !== t).concat(m).sort((a, b) => (a.d < b.d ? -1 : 1));
    await S.set("measures", state.measures);
    renderGoals();
    $("mOk").textContent = "บันทึกแล้ว";
  };
}

/* ---------------- progress photos ----------------
   Images stay on this device: the blob lives in IndexedDB under "photo:<id>", metadata in "photos".
   Nothing is uploaded anywhere. */
const POSES = { front: "หน้า", side: "ข้าง", back: "หลัง" };
const photoUrls = new Map();
let photoPose = "front", photoCmp = {}, photoDelArm = null;

async function photoUrl(id) {
  if (photoUrls.has(id)) return photoUrls.get(id);
  const b = await S.get("photo:" + id, null);
  if (!(b instanceof Blob)) return null;
  const u = URL.createObjectURL(b);
  photoUrls.set(id, u);
  return u;
}

// Downscale to 1280 px on the long side as JPEG; keeps each photo around 150–300 KB.
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("แปลงรูปไม่ได้"))), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("เปิดไฟล์รูปนี้ไม่ได้")); };
    img.src = src;
  });
}

// Body weight on or near a date (within 3 days), for captions.
function kgNear(d) {
  let best = null;
  for (const e of state.body) {
    const gap = Math.abs(Date.parse(e.d) - Date.parse(d)) / 864e5;
    if (gap <= 3 && (!best || gap < best.gap)) best = { kg: e.kg, gap };
  }
  return best ? best.kg.toFixed(1) + " kg" : "";
}

function photosHtml() {
  const list = (state.photos || []).filter((p) => p.pose === photoPose).sort((a, b) => (a.d < b.d ? -1 : 1));
  const all = state.photos || [];
  const lastD = all.length ? all.map((p) => p.d).sort().pop() : null;
  const due = !lastD || Date.now() - Date.parse(lastD) > 30 * 864e5;
  const from = list.find((p) => p.id === photoCmp.from) || list[0];
  const to = list.find((p) => p.id === photoCmp.to) || list[list.length - 1];
  const opt = (sel) => list.map((p) => `<option value="${p.id}" ${p.id === sel?.id ? "selected" : ""}>${fmtDate(p.d)}/${p.d.slice(2, 4)}</option>`).join("");
  const fig = (p, label) => `<figure class="ph"><img data-photo="${p.id}" alt="รูป${POSES[p.pose]} ${p.d}">
    <figcaption><b>${label}</b> ${fmtDate(p.d)}/${p.d.slice(2, 4)} <span class="mono">${kgNear(p.d)}</span></figcaption></figure>`;
  return `<div class="card" id="photos">
    <h3>รูปความคืบหน้า</h3>
    <p class="note">รูปเก็บในเครื่องนี้เท่านั้น ไม่อัปโหลดไปไหน ถ่ายเดือนละครั้งวันเดียวกับวัดรอบตัว ที่เดิม แสงเดิม ระยะเดิม ยืนสบายไม่เกร็ง ครบ 3 ท่า</p>
    ${due ? `<div class="banner"><b>${lastD ? "ครบเดือนแล้ว" : "ยังไม่มีรูป"}</b> ${lastD ? "ถึงเวลาถ่ายรูปรอบใหม่" : "ถ่ายรูปแรกไว้เป็นจุดเริ่มต้น พอผ่านไป 3 เดือนจะเห็นความต่างชัด"}</div>` : ""}
    <div class="seg" role="group" aria-label="ท่า">${Object.entries(POSES).map(([k, n]) =>
      `<button id="pose-${k}" data-pose="${k}" aria-pressed="${k === photoPose}">${n} ${all.filter((p) => p.pose === k).length}</button>`).join("")}</div>
    <div class="field">
      <input type="date" id="phDate" value="${today()}" max="${today()}" aria-label="วันที่ถ่าย">
      <label class="btn" for="phFile">เพิ่มรูปท่า${POSES[photoPose]}</label>
      <input type="file" id="phFile" accept="image/*" class="vh">
      <span id="phMsg" class="note"></span>
    </div>
    ${list.length >= 2 ? `<div class="cmp">
        <div class="field"><label for="cmpFrom">เทียบ</label><select id="cmpFrom">${opt(from)}</select>
        <label for="cmpTo">กับ</label><select id="cmpTo">${opt(to)}</select></div>
        <div class="phpair">${fig(from, "ก่อน")}${fig(to, "หลัง")}</div>
      </div>` : list.length === 1 ? `<p class="note">มีรูปท่า${POSES[photoPose]} 1 รูป เพิ่มอีกรูปในเดือนหน้าแล้วจะเทียบกันได้</p>` : ""}
    ${list.length ? `<div class="phgrid">${list.slice().reverse().map((p) => `<div class="thumb">
        <img data-photo="${p.id}" alt="รูป${POSES[p.pose]} ${p.d}">
        <div class="thumb-f"><span class="mono">${fmtDate(p.d)}/${p.d.slice(2, 4)}</span>
        <button class="x${photoDelArm === p.id ? " armed" : ""}" data-phdel="${p.id}" aria-label="ลบรูป ${p.d}">${photoDelArm === p.id ? "ลบ?" : "×"}</button></div></div>`).join("")}</div>` : ""}
  </div>`;
}

function wirePhotos() {
  document.querySelectorAll("img[data-photo]").forEach(async (img) => {
    const u = await photoUrl(img.dataset.photo);
    if (u) img.src = u; else img.alt = "หารูปไม่เจอในเครื่องนี้";
  });
  const rerender = () => { const y = window.scrollY; renderGoals(); window.scrollTo(0, y); };
  document.querySelectorAll("[data-pose]").forEach((b) => b.onclick = () => { photoPose = b.dataset.pose; photoCmp = {}; photoDelArm = null; rerender(); });
  const cf = $("cmpFrom"), ct = $("cmpTo");
  if (cf) cf.onchange = ct.onchange = () => { photoCmp = { from: cf.value, to: ct.value }; rerender(); };
  $("phFile").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || e.target.dataset.busy) return;
    e.target.dataset.busy = "1";
    $("phMsg").textContent = "กำลังบันทึก...";
    try {
      const blob = await shrinkImage(file);
      const id = uid();
      await S.set("photo:" + id, blob);
      const back = await S.get("photo:" + id, null);
      if (!(back instanceof Blob)) throw new Error("เบราว์เซอร์นี้เก็บรูปไม่ได้ (โหมดส่วนตัว?)");
      state.photos = (state.photos || []).concat({ id, d: $("phDate").value || today(), pose: photoPose });
      await S.set("photos", state.photos);
      photoCmp = {};
      rerender();
    } catch (err) {
      delete e.target.dataset.busy;
      $("phMsg").className = "err";
      $("phMsg").textContent = err.message;
    }
  };
  document.querySelectorAll("[data-phdel]").forEach((b) => b.onclick = async () => {
    const id = b.dataset.phdel;
    if (photoDelArm !== id) { photoDelArm = id; rerender(); return; } // first tap arms, second tap deletes
    photoDelArm = null;
    state.photos = state.photos.filter((p) => p.id !== id);
    await S.set("photos", state.photos);
    await S.del("photo:" + id);
    if (photoUrls.has(id)) { URL.revokeObjectURL(photoUrls.get(id)); photoUrls.delete(id); }
    rerender();
  });
}

/* ---------------- body weight ---------------- */
function renderBody() {
  const t = today();
  const cur = state.body.find((e) => e.d === t);
  const mode = bulkMode();
  const tr = L.bodyTrend(state.body, t, mode.range);
  const verdict = { slow: ["ขึ้นช้ากว่าเป้า", "ถ้าเป็นแบบนี้ 2 สัปดาห์ติด เพิ่มอาหาร 150–200 kcal/วัน", "hold"],
    fast: ["ขึ้นเร็วกว่าเป้า", "อาจเป็นไขมันมากกว่ากล้าม ลดลง 150 kcal/วัน", "down"],
    ok: ["ตรงเป้า", `ขึ้น ${mode.range[0]}–${mode.range[1]} kg/สัปดาห์ (โหมด ${mode.name}) ทำแบบนี้ต่อ`, "up"] }[tr.verdict];
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
  const slept = [];
  for (let i = 0; i < 7; i++) { const h = state.checkins[L.addDays(t, -i)]?.sleepH; if (h != null) slept.push(h); }
  const sleepAvg = slept.length >= 3 ? Math.round((slept.reduce((a, b) => a + b, 0) / slept.length) * 10) / 10 : null;
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
        <div class="field"><label for="ckSleep">เมื่อคืนนอน</label><input type="number" id="ckSleep" min="0" max="14" step="0.5" inputmode="decimal" value="${c.sleepH ?? ""}" placeholder="7.5"><span>ชม.</span></div>
        <div class="checks">${L.SIGNS.map((s) => `<label><input type="checkbox" id="ck_${s.k}" ${c[s.k] ? "checked" : ""}>${esc(s.t)}</label>`).join("")}</div>
        <div class="row-actions"><button class="btn" id="ckSave">บันทึก check-in</button><span id="ckOk" class="saved">${state.checkins[t] ? "บันทึกวันนี้แล้ว" : ""}</span></div>
      </div>
      <div class="card">
        <h3>14 วันล่าสุด</h3>
        <div class="dots">${dots.join("")}</div>
        <p class="note">เขียว = ปกติ · เหลือง = 1 ข้อ · แดง = 2 ข้อขึ้นไป · เทา = ไม่ได้บันทึก</p>
        ${sleepAvg ? `<p class="mono">นอนเฉลี่ย 7 วัน ${sleepAvg} ชม.${sleepAvg < 7 ? " · น้อยไป" : ""}</p>` : ""}
      </div>
    </div>
    ${sexHtml()}`;
  $("ckSave").onclick = async () => {
    const rec = {};
    L.SIGNS.forEach((s) => (rec[s.k] = $("ck_" + s.k).checked));
    const h = Number($("ckSleep").value);
    if ($("ckSleep").value !== "" && h >= 0 && h <= 14) {
      rec.sleepH = h;
      if (h < 7) rec.poorSleep = true;
    }
    state.checkins[t] = rec;
    await S.set("checkins", state.checkins);
    renderCheck();
  };
  wireSex();
}

/* ---------------- sex log ---------------- */
// Logged in the evening for today, or the next morning for last night.
let sexDay = null, sexDraft = {};
const SEX_SCALE = {
  erect: ["แข็งตัวแค่ไหน", "1 แทบไม่แข็ง", "5 แข็งเต็มที่ตลอด"],
  stamina: ["อึดและคุมได้แค่ไหน", "1 เสร็จเร็วมาก", "5 คุมได้ตามต้องการ"],
};
function sexHtml() {
  const t = today(), y = L.addDays(t, -1);
  sexDay = sexDay || (new Date().getHours() >= 15 ? t : y);
  const cur = state.sex[sexDay];
  if (!sexDraft.d || sexDraft.d !== sexDay) sexDraft = { d: sexDay, erect: cur?.erect, stamina: cur?.stamina };
  const fat = {};
  for (const [d, list] of Object.entries(state.food)) if (list.length) fat[d] = L.dayTotals(list).f;
  const ins = L.sexInsights(state.sex, state.checkins, fat, t);
  const need = Math.max(0, 6 - ins.n);
  const rate = (k) => `<span class="label">${SEX_SCALE[k][0]}</span><div class="rate" role="group" aria-label="${SEX_SCALE[k][0]}">${[1, 2, 3, 4, 5].map((v) =>
    `<button data-rate="${k}" data-v="${v}" aria-pressed="${sexDraft[k] === v}">${v}</button>`).join("")}</div>
    <p class="note" style="margin-top:-6px">${SEX_SCALE[k][1]} · ${SEX_SCALE[k][2]}</p>`;
  return `<div class="grid2">
    <div class="card">
      <h3>บันทึกเซ็กส์</h3>
      <p class="note">อยู่ในเครื่องนี้เท่านั้น ใช้หาว่าการนอน การซ้อม และอาหารแบบไหนทำให้ดีขึ้น วันที่ไม่มีเซ็กส์ไม่ต้องบันทึก</p>
      <div class="seg" role="group" aria-label="วันที่">
        <button data-sexday="${y}" aria-pressed="${sexDay === y}">เมื่อวาน</button><button data-sexday="${t}" aria-pressed="${sexDay === t}">วันนี้</button>
      </div>
      <div style="margin-top:10px">${rate("erect")}${rate("stamina")}</div>
      <div class="row-actions"><button class="btn" id="sexSave">บันทึก</button>
        ${cur ? `<button class="btn ghost" id="sexDel">ลบของ${sexDay === t ? "วันนี้" : "เมื่อวาน"}</button>` : ""}
        <span id="sexOk" class="saved">${cur ? `บันทึกแล้ว ${cur.erect}/${cur.stamina}` : ""}</span></div>
    </div>
    <div class="card">
      <h3>อะไรทำให้ดีขึ้น</h3>
      ${ins.n ? `<p class="mono">${ins.n} ครั้งใน 90 วัน · แข็งตัวเฉลี่ย ${ins.erect} · อึดเฉลี่ย ${ins.stamina}</p>` : ""}
      ${ins.comps.length ? ins.comps.map((c) => `<div class="cmpline"><b>${esc(c.t)}</b>
          <span>${esc(c.a.name)} <span class="note">${c.a.n} ครั้ง</span></span><span class="mono">${c.a.avg}</span>
          <span>${esc(c.b.name)} <span class="note">${c.b.n} ครั้ง</span></span><span class="mono">${c.b.avg}</span></div>`).join("") +
          `<p class="note">คะแนน = เฉลี่ยแข็งตัวกับอึด (เต็ม 5) ต่างกันไม่ถึง 0.5 ถือว่ายังบอกไม่ได้ ข้อมูลยิ่งเยอะยิ่งแม่น</p>`
        : `<p class="note">${need ? `บันทึกอีกอย่างน้อย ${need} ครั้ง` : "ยังมีข้อมูลไม่พอแยกกลุ่ม"} แอปจะเริ่มเทียบให้ เช่น คืนที่นอนพอกับนอนน้อย วันขากับวันอื่น และวันที่กินไขมันพอกับไม่พอ (ต้องมีฝั่งละ 3 ครั้งขึ้นไป) กรอกชั่วโมงนอนใน check-in ทุกเช้าด้วย</p>`}
    </div>
  </div>`;
}
function wireSex() {
  document.querySelectorAll("[data-sexday]").forEach((b) => b.onclick = () => { sexDay = b.dataset.sexday; renderCheck(); });
  document.querySelectorAll("[data-rate]").forEach((b) => b.onclick = () => {
    sexDraft[b.dataset.rate] = Number(b.dataset.v);
    b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  $("sexSave").onclick = async () => {
    if (!sexDraft.erect || !sexDraft.stamina) { $("sexOk").className = "err"; $("sexOk").textContent = "เลือกคะแนนให้ครบทั้ง 2 ข้อ"; return; }
    state.sex[sexDay] = { erect: sexDraft.erect, stamina: sexDraft.stamina };
    await S.set("sex", state.sex);
    renderCheck();
  };
  if ($("sexDel")) $("sexDel").onclick = async () => {
    delete state.sex[sexDay];
    sexDraft = {};
    await S.set("sex", state.sex);
    renderCheck();
  };
}

/* ---------------- backup ---------------- */
function renderData() {
  const sessions = Object.values(state.logs).reduce((a, r) => a + r.history.length, 0);
  const days = new Set(Object.values(state.logs).flatMap((r) => r.history.map((h) => h.d))).size;
  $("p-data").innerHTML = `
    <h2>สำรองข้อมูล</h2>
    <div class="card">
      <h3>ภาพเคลื่อนไหว</h3>
      <div class="seg" role="group" aria-label="ภาพเคลื่อนไหว">
        ${[["on", "เปิดเสมอ"], ["auto", "ตามเครื่อง"], ["off", "ปิด"]].map(([k, t]) => `<button data-motion="${k}" aria-pressed="${(state.settings.motion || "on") === k}">${t}</button>`).join("")}
      </div>
      <p class="note">ถ้ามือถือเปิด "ลดการเคลื่อนไหว" ไว้ (iPhone: Reduce Motion · Android: ปิดภาพเคลื่อนไหว) แบบตามเครื่องจะไม่มีภาพเคลื่อนไหวเลย แบบเปิดเสมอจะเล่นในแอปนี้ไม่ว่ามือถือตั้งไว้อย่างไร</p>
    </div>
    <div class="grid2">
      <div class="card">
        <h3>ข้อมูลในเครื่องนี้</h3>
        <p><span class="mono">${days}</span> วันที่ซ้อม · <span class="mono">${sessions}</span> รายการท่า · <span class="mono">${state.body.length}</span> ครั้งที่ชั่งน้ำหนัก</p>
        <p class="note">เริ่มบล็อก ${fmtDate(state.settings.startDate)} · สำรองล่าสุด ${state.settings.lastExport ? new Date(state.settings.lastExport).toLocaleDateString("th-TH") : "ยังไม่เคย"}</p>
        <p class="note">ข้อมูลอยู่ในเบราว์เซอร์ของเครื่องนี้ ถ้าล้างข้อมูลเว็บหรือเปลี่ยนเครื่องจะหาย ควร Export ทุกสัปดาห์ ไฟล์มีบันทึกเซ็กส์และสุขภาพด้วย เก็บไว้ในที่ส่วนตัว อย่าส่งให้ใคร</p>
        ${state.photos?.length ? `<label class="checkline"><input type="checkbox" id="expPhotos"> รวมรูปความคืบหน้า ${state.photos.length} รูปในไฟล์ด้วย (ไฟล์ใหญ่ขึ้นราว ${Math.round(state.photos.length * 0.3)} MB เก็บไฟล์นี้ในที่ส่วนตัวเท่านั้น)</label>` : ""}
        <div class="row-actions"><button class="btn" id="exp">Export ไฟล์ JSON</button></div>
      </div>
      <div class="card">
        <h3>นำเข้าไฟล์สำรอง</h3>
        <p class="note">รวมข้อมูลจากไฟล์เข้ากับของเดิม วันที่ซ้ำกันจะใช้ค่าจากไฟล์ ไม่ลบรายการที่ใหม่กว่า</p>
        <div class="row-actions"><input type="file" id="imp" accept="application/json,.json"><span id="impOk"></span></div>
      </div>
    </div>`;
  document.querySelectorAll("[data-motion]").forEach((b) => b.onclick = async () => {
    state.settings.motion = b.dataset.motion;
    await S.set("settings", state.settings);
    applyMotion();
    renderData();
  });
  $("exp").onclick = async () => {
    const data = await S.exportAll();
    if ($("expPhotos")?.checked && state.photos?.length) {
      data.photos = state.photos;
      data.photoData = {};
      for (const p of state.photos) {
        const b = await S.get("photo:" + p.id, null);
        if (b instanceof Blob) data.photoData[p.id] = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
      }
    }
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
      // photos travel only when the backup was exported with them
      if (Array.isArray(inc.photos) && inc.photoData) {
        const have = new Set((state.photos || []).map((p) => p.id));
        for (const p of inc.photos) {
          const url = inc.photoData[p.id];
          if (have.has(p.id) || typeof url !== "string" || !url.startsWith("data:image/")) continue;
          await S.set("photo:" + p.id, await (await fetch(url)).blob());
          state.photos = (state.photos || []).concat({ id: p.id, d: p.d, pose: p.pose });
        }
        await S.set("photos", state.photos);
      }
      renderAll();
      $("impOk").className = "saved"; $("impOk").textContent = "นำเข้าเรียบร้อย";
    } catch (err) {
      out.className = "err";
      out.textContent = "นำเข้าไม่ได้: " + (err.message || "ไฟล์เสีย");
    }
  };
}

boot();
