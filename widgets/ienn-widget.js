// IENN home screen widget for Scriptable (iPhone). Small + medium.
// Setup: docs/widget-2026-10-25.md. Nothing to edit: run it once in the Scriptable app and enter the passphrase.
// This file holds NO secret. The passphrase is kept only in this iPhone's Keychain (Scriptable Keychain, item below).

const ENDPOINT = "https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec";   // public web-app URL the website already uses
const KEYCHAIN_ITEM = "ienn_metrics_key";

// Which period sits under "Today" is chosen PER WIDGET, no editing needed:
//   long-press the widget > Edit Widget > Parameter:  7d (default) · 30d · qtd · ytd · all (medium only: every period in a table)

// Optional good/bad colouring. Empty = every number stays neutral.
// Per metric id, per period (today, d7, d30, qtd, ytd): value >= good -> green, value <= bad -> red, otherwise neutral.
// Example (uncomment to use):
//   const THRESHOLDS = {
//     visits: { today: { good: 20, bad: 3 }, d7: { good: 150, bad: 30 }, d30: { good: 600 } },
//     orders: { d7: { good: 5, bad: 0 }, ytd: { good: 200 } },
//   };
const THRESHOLDS = {};

const REFRESH_MINUTES = 15;                 // iOS decides the real schedule; this is the earliest we ask for
const SITE = "https://www.inlandempirenativenursery.com";
const ASSET_BASE = "https://www.inlandempirenativenursery.com/widgets/";   // bg-small.jpg, bg-medium.jpg, logo.jpg (committed in the repo)
const ASSET_VERSION = "1";                  // bump when the images change so phones re-download them
const C = {                                 // IENN palette; text shades darkened so every label is >= 4.5:1 (WCAG AA) on its panel
  cream: new Color("#f8f6f3"), panel: new Color("#f8f6f3", 0.86), lilac: new Color("#d4c4e0"),
  ink: new Color("#3f4d3f"),                // numbers
  label: new Color("#4f5e4e"),              // metric names
  muted: new Color("#5a6859"),              // period values, captions, footer
  good: new Color("#2a6e40"), bad: new Color("#a33a37"),
};

const PERIODS = {   // key: [header label, short label]
  today: ["Today", "Today"], d7: ["7 days", "7d"], d30: ["30 days", "30d"], qtd: ["This quarter", "QTD"], ytd: ["Year to date", "YTD"],
};
const PARAM_TO_PERIOD = { "7d": "d7", "7": "d7", "week": "d7", "30d": "d30", "30": "d30", "month": "d30", "qtd": "qtd", "quarter": "qtd", "ytd": "ytd", "year": "ytd", "all": "all" };
function choosePeriod(param, small) {
  const p = PARAM_TO_PERIOD[String(param || "").trim().toLowerCase()] || "d7";
  return p === "all" && small ? "d7" : p;               // the 'all' table needs the medium size
}

// ---------- data ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "ienn-widget-cache.json");

function savedKey() { try { return Keychain.contains(KEYCHAIN_ITEM) ? String(Keychain.get(KEYCHAIN_ITEM) || "") : ""; } catch (e) { return ""; } }

async function load(key) {
  if (!key) return { setup: true };
  try {
    const req = new Request(`${ENDPOINT}?view=metrics&key=${encodeURIComponent(key)}`);
    req.timeoutInterval = 20;
    const j = await req.loadJSON();
    if (j && j.error === "unauthorized") return withCache({ error: "Passphrase not accepted", unauthorized: true });
    if (!j || !j.ok) return withCache({ error: "Server not ready" });
    fm.writeString(cachePath, JSON.stringify(j));
    return { data: j };
  } catch (e) {
    return withCache({ error: "Offline" });
  }
}
function withCache(r) {
  try { if (fm.fileExists(cachePath)) r.data = JSON.parse(fm.readString(cachePath)); } catch (e) {}
  r.stale = !!r.data;
  return r;
}

// Images: downloaded once, kept in Scriptable's local files, re-checked every 30 days. Missing/offline -> plain cream + text title.
async function asset(name) {
  const path = fm.joinPath(fm.documentsDirectory(), `ienn-${ASSET_VERSION}-${name}`);
  const have = fm.fileExists(path);
  const fresh = have && (Date.now() - fm.modificationDate(path).getTime()) < 30 * 864e5;
  if (!fresh) {
    try {
      const req = new Request(`${ASSET_BASE}${name}?v=${ASSET_VERSION}`); req.timeoutInterval = 15;
      const img = await req.loadImage();
      if (img && img.size && img.size.width > 0) { fm.writeImage(path, img); return img; }
    } catch (e) {}
  }
  try { return have ? fm.readImage(path) : null; } catch (e) { return null; }
}

// ---------- formatting ----------
function fmtNum(v, unit) {
  if (v === null || v === undefined) return "–";
  const n = Number(v);
  if (unit === "$") return n >= 10000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `$${Math.round(n).toLocaleString()}`;
  if (n >= 10000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  return Math.round(n).toLocaleString();
}
function val(m, key) {                                  // works with this endpoint and the older {today, week} one
  if (m.periods && key in m.periods) return m.periods[key];
  return key === "today" ? m.today : key === "d7" ? m.week : null;
}
function clipped(m, key) { return !!(m.since && m.since[key]); }
function colorFor(id, key, v) {
  const byId = THRESHOLDS[id] || {}, t = byId[key] || (key === "d7" ? byId.week : null);
  if (!t || v === null || v === undefined) return null;
  if (t.good !== undefined && v >= t.good) return C.good;
  if (t.bad !== undefined && v <= t.bad) return C.bad;
  return null;
}
function timeLabel(iso) {
  const d = new Date(iso); if (isNaN(d)) return "";
  const df = new DateFormatter();
  const sameDay = d.toDateString() === new Date().toDateString();
  df.dateFormat = sameDay ? "h:mm a" : "MMM d, h:mm a";
  return df.string(d);
}

// ---------- layout ----------
function pill(parent) { const p = parent.addStack(); p.backgroundColor = C.panel; p.cornerRadius = 8; p.setPadding(3, 7, 3, 7); p.centerAlignContent(); return p; }

// Logo used as-is (scaled only), on its own white frame with rounded corners, so it reads as a header chip, not a pasted box.
const LOGO_RATIO = 1500 / 847;
function header(w, small, period, img) {
  const h = w.addStack(); h.centerAlignContent();
  if (img.logo) {
    const hgt = small ? 30 : 36, li = h.addImage(img.logo);
    li.imageSize = new Size(Math.round(hgt * LOGO_RATIO), hgt); li.cornerRadius = 8;
  } else {
    const p = pill(h), name = p.addText(small ? "IENN" : "Inland Empire Native Nursery");
    name.font = Font.boldSystemFont(small ? 15 : 13); name.textColor = C.ink; name.lineLimit = 1; name.minimumScaleFactor = 0.8;
  }
  h.addSpacer();
  if (period !== "all") {
    const p = pill(h), leg = p.addText(small ? `today · ${PERIODS[period][1]}` : `today · ${PERIODS[period][0].toLowerCase()}`);
    leg.font = Font.semiboldSystemFont(10); leg.textColor = C.muted; leg.lineLimit = 1; leg.minimumScaleFactor = 0.8;
  }
  w.addSpacer(small ? 6 : 7);
}
function num(stack, m, key, font, color, star) {
  const v = val(m, key), t = stack.addText(fmtNum(v, m.unit) + (star && clipped(m, key) ? "*" : ""));
  t.font = font; t.textColor = colorFor(m.id, key, v) || color; t.lineLimit = 1; t.minimumScaleFactor = 0.6;
  return t;
}

function rowSmall(w, m, period) {
  const r = w.addStack(); r.centerAlignContent();
  const l = r.addText(m.label); l.font = Font.mediumSystemFont(12); l.textColor = C.label; l.lineLimit = 1;
  r.addSpacer();
  num(r, m, "today", Font.boldRoundedSystemFont(17), C.ink);
  r.addSpacer(6);
  num(r, m, period, Font.mediumRoundedSystemFont(12), C.muted, true).rightAlignText();
}

function colMedium(row, m, period) {
  const c = row.addStack(); c.layoutVertically(); c.backgroundColor = C.panel; c.cornerRadius = 12; c.setPadding(6, 9, 6, 9);
  const l = c.addText(m.label); l.font = Font.mediumSystemFont(11); l.textColor = C.label; l.lineLimit = 1;
  num(c, m, "today", Font.boldRoundedSystemFont(24), C.ink);
  const k = c.addStack(); k.centerAlignContent();
  const pl = k.addText(PERIODS[period][1] + "  "); pl.font = Font.mediumSystemFont(11); pl.textColor = C.muted;
  num(k, m, period, Font.mediumRoundedSystemFont(11), C.muted, true);
  c.addSpacer();
}

// Medium 'all': label column + Today/7d/30d/QTD/YTD columns (fixed widths so the numbers line up).
const ALL_KEYS = ["today", "d7", "d30", "qtd", "ytd"], LABEL_W = 60, COL_W = 52;
function tableAll(w0, ms) {
  const w = w0.addStack(); w.layoutVertically(); w.backgroundColor = C.panel; w.cornerRadius = 12; w.setPadding(5, 8, 3, 8);
  const hr = w.addStack(); hr.centerAlignContent();
  const sp = hr.addStack(); sp.size = new Size(LABEL_W, 0);
  ALL_KEYS.forEach(k => { const c = hr.addStack(); c.size = new Size(COL_W, 0); c.addSpacer();
    const t = c.addText(PERIODS[k][1]); t.font = Font.semiboldSystemFont(10); t.textColor = C.muted; });
  w.addSpacer(3);
  ms.forEach(m => {
    const r = w.addStack(); r.centerAlignContent();
    const lc = r.addStack(); lc.size = new Size(LABEL_W, 0);
    const l = lc.addText(m.label); l.font = Font.mediumSystemFont(12); l.textColor = C.label; l.lineLimit = 1; l.minimumScaleFactor = 0.7; lc.addSpacer();
    ALL_KEYS.forEach(k => { const c = r.addStack(); c.size = new Size(COL_W, 0); c.addSpacer();
      num(c, m, k, k === "today" ? Font.boldRoundedSystemFont(15) : Font.mediumRoundedSystemFont(13), k === "today" ? C.ink : C.muted, true); });
    w.addSpacer(2);
  });
}

function footer(w, res, ms, period) {
  w.addSpacer();
  const f = w.addStack(); f.centerAlignContent();
  const fp = pill(f); f.addSpacer();
  let msg;
  if (res.data && res.data.updated) msg = `Updated ${timeLabel(res.data.updated)}`;
  if (res.stale) msg = `${res.error} · ${msg}`;
  else if (res.error) msg = res.error;
  if (res.data && res.data.partial && !res.stale) msg += " · some data missing";
  const keys = period === "all" ? ALL_KEYS : [period];
  const since = (ms || []).map(m => keys.map(k => clipped(m, k) && m.since[k]).find(Boolean)).find(Boolean);
  if (since) msg += ` · *from ${shortDate(since)}`;
  const t = fp.addText(msg || ""); t.font = Font.mediumSystemFont(9); t.textColor = res.error ? C.bad : C.muted; t.lineLimit = 1; t.minimumScaleFactor = 0.7;
}
function shortDate(ymd) { const df = new DateFormatter(); df.dateFormat = "MMM d"; return df.string(new Date(ymd + "T12:00:00")); }

function build(res, family, param, img = {}) {
  const small = family === "small", period = choosePeriod(param, small);
  const w = new ListWidget();
  w.backgroundColor = C.cream; w.url = SITE;
  if (img.bg) w.backgroundImage = img.bg;          // washed photo baked into the JPG; cream stays underneath as the fallback
  w.setPadding(10, 12, 9, 12);
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);
  header(w, small, period, img);
  if (res.setup) {
    const p = w.addStack(); p.backgroundColor = C.panel; p.cornerRadius = 12; p.setPadding(8, 10, 8, 10);
    const t = p.addText("Open Scriptable and run IENN once to set it up"); t.font = Font.mediumSystemFont(13); t.textColor = C.ink;
    return w;
  }
  if (!res.data) {
    const t = w.addText(res.error === "Offline" ? "No connection yet — will retry." : res.unauthorized ? "Passphrase not accepted — open Scriptable and run IENN" : res.error);
    t.font = Font.mediumSystemFont(13); t.textColor = C.ink;
    footer(w, res, [], period); return w;
  }
  const ms = (res.data.metrics || []).slice(0, 4);
  if (period === "all") tableAll(w, ms);
  else if (small) {
    const panel = w.addStack(); panel.layoutVertically(); panel.backgroundColor = C.panel; panel.cornerRadius = 12; panel.setPadding(5, 8, 5, 8);
    ms.forEach((m, i) => { if (i) panel.addSpacer(3); rowSmall(panel, m, period); });
  }
  else { const row = w.addStack(); row.spacing = 8; ms.forEach(m => colMedium(row, m, period)); }
  footer(w, res, ms, period);
  return w;
}

// ---------- in-app setup (passphrase -> Keychain) ----------
async function say(title, message) { const a = new Alert(); a.title = title; a.message = message; a.addAction("OK"); await a.presentAlert(); }

/** Asks for the passphrase, saves it to the Keychain, tests it. Returns the load() result, or null if cancelled. */
async function askPassphrase() {
  const a = new Alert();
  a.title = "IENN widget";
  a.message = "Enter your IENN widget passphrase";
  a.addSecureTextField("Passphrase", "");
  a.addAction("Save");
  a.addCancelAction("Cancel");
  if ((await a.presentAlert()) === -1) return null;
  const key = String(a.textFieldValue(0) || "").trim();
  if (!key) { await say("IENN widget", "No passphrase entered. Nothing was saved."); return null; }
  Keychain.set(KEYCHAIN_ITEM, key);
  const res = await load(key);
  if (res.unauthorized) {
    Keychain.remove(KEYCHAIN_ITEM);
    await say("Passphrase not accepted", "That passphrase didn't work, so it was cleared. Run IENN again to try another one.");
    return null;
  }
  if (res.error) await say("Saved", `The passphrase is saved, but the server couldn't be reached right now (${res.error}). The widget will keep retrying.`);
  else await say("Connected", "All set. Add the widget: long-press the Home Screen > + > Scriptable > pick IENN under Edit Widget > Script.");
  return res;
}

/** In the app with a passphrase already saved: preview, change or remove it. Returns {res, family} to preview, or null. */
async function appMenu(key) {
  const a = new Alert();
  a.title = "IENN widget";
  a.message = "The passphrase is saved on this iPhone.";
  a.addAction("Preview widget (medium)");
  a.addAction("Preview widget (small)");
  a.addAction("Change passphrase");
  a.addDestructiveAction("Remove passphrase");
  a.addCancelAction("Cancel");
  const i = await a.presentAlert();
  if (i === 0 || i === 1) return { res: await load(key), family: i === 0 ? "medium" : "small" };
  if (i === 2) { const res = await askPassphrase(); return res ? { res, family: "medium" } : null; }
  if (i === 3) { Keychain.remove(KEYCHAIN_ITEM); await say("Removed", "The passphrase was removed from this iPhone. Run IENN again to set a new one."); }
  return null;
}

async function render(res, family) {
  const size = family === "small" ? "small" : "medium";
  const [bg, logo] = await Promise.all([asset(`bg-${size}.jpg`), asset("logo.jpg")]);
  return build(res, size, args.widgetParameter, { bg, logo });
}

// ---------- run ----------
const key = savedKey();
if (config.runsInWidget) {
  Script.setWidget(await render(await load(key), config.widgetFamily));
} else if (config.runsInApp) {
  const pick = key ? await appMenu(key) : await askPassphrase().then(res => (res ? { res, family: "medium" } : null));
  if (pick) { const w = await render(pick.res, pick.family); if (pick.family === "small") await w.presentSmall(); else await w.presentMedium(); }
} else {
  await (await render(await load(key), "medium")).presentMedium();    // Siri / Shortcuts: just show it
}
Script.complete();
