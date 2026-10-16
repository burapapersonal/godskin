import { PHASES, DAYS } from "./program.js";
import * as L from "./logic.js";
import * as S from "./store.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtDate = (d) => { const [, m, dd] = d.split("-"); return `${+dd}/${+m}`; };

const state = {
  logs: {},       // exId -> { history: [{ d, w:[], r:[], wk }] }
  settings: {},   // { startDate, lastExport }
  body: [],       // [{ d, kg }]
  checkins: {},   // date -> { noMorning, lowLibido, ... }
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
  if (!state.settings.startDate) {
    state.settings.startDate = L.startForWeek(1, today());
    await S.set("settings", state.settings);
  }
  const dow = new Date().getDay();
  state.dayIdx = Math.max(0, DAYS.findIndex((d) => d.dow === dow));
  const hash = location.hash.slice(1);
  if (["train", "body", "check", "rules", "data"].includes(hash)) state.tab = hash;

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
  ({ train: renderTrain, body: renderBody, check: renderCheck, data: renderData, rules: () => {} })[state.tab]();
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
