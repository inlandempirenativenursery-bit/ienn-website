// IENN home screen widget for Scriptable (iPhone). Small + medium.
// Setup: docs/widget-2026-10-25.md. Paste the two lines below, nothing else needs editing.

const ENDPOINT = "PASTE_WEB_APP_URL_HERE";   // the Apps Script /exec URL (same one the website uses), e.g. https://script.google.com/macros/s/AKfy…/exec
const KEY      = "PASTE_METRICS_KEY_HERE";   // the METRICS_KEY Lobo set in Script Properties

// Optional good/bad colouring. Empty = every number stays neutral.
// Per metric id, per window ("today" / "week"): value >= good -> green, value <= bad -> red, otherwise neutral.
// Example (uncomment to use):
//   const THRESHOLDS = {
//     visits: { today: { good: 20, bad: 3 }, week: { good: 150, bad: 30 } },
//     orders: { week:  { good: 5,  bad: 0 } },
//   };
const THRESHOLDS = {};

const REFRESH_MINUTES = 15;                 // iOS decides the real schedule; this is the earliest we ask for
const SITE = "https://www.inlandempirenativenursery.com";
const C = {                                 // IENN palette (shop.css)
  cream: new Color("#f8f6f3"), sage: new Color("#6b7c6a"), sageDark: new Color("#4a5a4a"),
  lilac: new Color("#d4c4e0"), muted: new Color("#7d8a7c"), good: new Color("#2f7d4a"), bad: new Color("#b0413e"),
};

// ---------- data ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "ienn-widget-cache.json");

async function load() {
  if (ENDPOINT.startsWith("PASTE") || KEY.startsWith("PASTE")) return { setup: true };
  try {
    const req = new Request(`${ENDPOINT}?view=metrics&key=${encodeURIComponent(KEY)}`);
    req.timeoutInterval = 20;
    const j = await req.loadJSON();
    if (!j || !j.ok) return withCache({ error: j && j.error === "unauthorized" ? "Key not accepted" : "Server not ready" });
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

// ---------- formatting ----------
function fmtNum(v, unit) {
  if (v === null || v === undefined) return "–";
  const n = Number(v);
  if (unit === "$") return n >= 10000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `$${Math.round(n).toLocaleString()}`;
  if (n >= 10000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  return Math.round(n).toLocaleString();
}
function colorFor(id, win, v) {
  const t = THRESHOLDS[id] && THRESHOLDS[id][win];
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
function header(w, small) {
  const h = w.addStack(); h.centerAlignContent();
  const name = h.addText(small ? "IENN" : "Inland Empire Native Nursery");
  name.font = Font.boldSystemFont(small ? 15 : 13); name.textColor = C.sageDark; name.lineLimit = 1; name.minimumScaleFactor = 0.8;
  h.addSpacer();
  const leg = h.addText(small ? "today · 7d" : "today  ·  last 7 days");
  leg.font = Font.mediumSystemFont(10); leg.textColor = C.muted;
  const bar = w.addStack(); bar.size = new Size(0, 2); bar.backgroundColor = C.lilac; bar.cornerRadius = 1;   // lilac rule
  w.addSpacer(small ? 6 : 8);
}

function rowSmall(w, m) {
  const r = w.addStack(); r.centerAlignContent();
  const l = r.addText(m.label); l.font = Font.mediumSystemFont(12); l.textColor = C.sage; l.lineLimit = 1;
  r.addSpacer();
  const t = r.addText(fmtNum(m.today, m.unit)); t.font = Font.boldRoundedSystemFont(17); t.textColor = colorFor(m.id, "today", m.today) || C.sageDark;
  r.addSpacer(6);
  const k = r.addText(fmtNum(m.week, m.unit)); k.font = Font.mediumRoundedSystemFont(12); k.textColor = colorFor(m.id, "week", m.week) || C.muted;
  k.rightAlignText();
}

function colMedium(row, m) {
  const c = row.addStack(); c.layoutVertically(); c.backgroundColor = Color.white(); c.cornerRadius = 10; c.setPadding(7, 9, 7, 9);
  const l = c.addText(m.label); l.font = Font.mediumSystemFont(11); l.textColor = C.sage; l.lineLimit = 1;
  const t = c.addText(fmtNum(m.today, m.unit)); t.font = Font.boldRoundedSystemFont(24); t.textColor = colorFor(m.id, "today", m.today) || C.sageDark;
  t.minimumScaleFactor = 0.6; t.lineLimit = 1;
  const k = c.addText(`7d  ${fmtNum(m.week, m.unit)}`); k.font = Font.mediumRoundedSystemFont(11); k.textColor = colorFor(m.id, "week", m.week) || C.muted;
  c.addSpacer();
}

function footer(w, res) {
  w.addSpacer();
  const f = w.addStack(); f.centerAlignContent();
  let msg;
  if (res.data && res.data.updated) msg = `Updated ${timeLabel(res.data.updated)}`;
  if (res.stale) msg = `${res.error} · ${msg}`;
  else if (res.error) msg = res.error;
  if (res.data && res.data.partial && !res.stale) msg += " · some data missing";
  const t = f.addText(msg || ""); t.font = Font.systemFont(9); t.textColor = res.error ? C.bad : C.muted; t.lineLimit = 1; t.minimumScaleFactor = 0.8;
}

function build(res, family) {
  const small = family === "small";
  const w = new ListWidget();
  w.backgroundColor = C.cream; w.url = SITE;
  w.setPadding(12, 14, 10, 14);
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);
  header(w, small);
  if (res.setup) {
    const t = w.addText("Open the script and paste ENDPOINT and KEY at the top."); t.font = Font.systemFont(12); t.textColor = C.sageDark;
    return w;
  }
  if (!res.data) {
    const t = w.addText(res.error === "Offline" ? "No connection yet — will retry." : res.error);
    t.font = Font.mediumSystemFont(13); t.textColor = C.sageDark;
    footer(w, res); return w;
  }
  const ms = res.data.metrics || [];
  if (small) {
    ms.slice(0, 4).forEach((m, i) => { if (i) w.addSpacer(4); rowSmall(w, m); });
  } else {
    const row = w.addStack(); row.spacing = 8;
    ms.slice(0, 4).forEach(m => colMedium(row, m));
  }
  footer(w, res);
  return w;
}

// ---------- run ----------
const res = await load();
const family = config.runsInWidget ? config.widgetFamily : "medium";
const widget = build(res, family === "small" ? "small" : "medium");
if (config.runsInWidget) Script.setWidget(widget);
else if (family === "small") await widget.presentSmall();
else await widget.presentMedium();
Script.complete();
