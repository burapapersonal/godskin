// Local persistence: one IndexedDB key-value store, with localStorage as a fallback
// for browsers that block IndexedDB (some private modes).

const DB_NAME = "godskin";
const STORE = "kv";
let dbp = null;

function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
  }));
}

export async function get(key, fallback) {
  try {
    const v = await tx("readonly", (s) => s.get(key));
    return v === undefined ? fallback : v;
  } catch {
    try { const v = localStorage.getItem("godskin." + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
}

export async function set(key, value) {
  try {
    await tx("readwrite", (s) => s.put(value, key));
  } catch {
    try { localStorage.setItem("godskin." + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }
}

// Ask the browser not to evict our data under storage pressure.
export async function persist() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}

export const KEYS = ["logs", "settings", "body", "checkins", "food", "measures"];

export async function exportAll() {
  const out = { app: "godskin", version: 1, exportedAt: new Date().toISOString() };
  for (const k of KEYS) out[k] = await get(k, null);
  return out;
}

// Merge an exported file into current data. Logs merge per exercise and per date (the file wins
// on the same date), so importing an older backup never deletes newer sessions.
export function mergeData(cur, inc) {
  const logs = structuredClone(cur.logs || {});
  for (const [id, rec] of Object.entries(inc.logs || {})) {
    const byDate = new Map((logs[id]?.history || []).map((h) => [h.d, h]));
    for (const h of rec.history || []) byDate.set(h.d, h);
    logs[id] = { history: [...byDate.values()].sort((a, b) => (a.d < b.d ? -1 : 1)) };
  }
  const bodyMap = new Map((cur.body || []).map((e) => [e.d, e]));
  for (const e of inc.body || []) bodyMap.set(e.d, e);
  // food: per date, union of entries by id
  const food = structuredClone(cur.food || {});
  for (const [d, list] of Object.entries(inc.food || {})) {
    const byId = new Map((food[d] || []).map((e) => [e.id, e]));
    for (const e of list) byId.set(e.id, e);
    food[d] = [...byId.values()];
  }
  const mMap = new Map((cur.measures || []).map((e) => [e.d, e]));
  for (const e of inc.measures || []) mMap.set(e.d, e);
  return {
    measures: [...mMap.values()].sort((a, b) => (a.d < b.d ? -1 : 1)),
    food,
    logs,
    settings: { ...(cur.settings || {}), ...(inc.settings || {}) },
    body: [...bodyMap.values()].sort((a, b) => (a.d < b.d ? -1 : 1)),
    checkins: { ...(cur.checkins || {}), ...(inc.checkins || {}) },
  };
}
