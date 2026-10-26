// IENN home screen widget for Scriptable (iPhone). Small + medium.
// Setup: docs/widget-2026-10-25.md. Paste the two lines below, nothing else needs editing.

const ENDPOINT = "PASTE_WEB_APP_URL_HERE";   // the Apps Script /exec URL (same one the website uses), e.g. https://script.google.com/macros/s/AKfy…/exec
const KEY      = "PASTE_METRICS_KEY_HERE";   // the METRICS_KEY Lobo set in Script Properties

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
const C = {                                 // IENN palette (shop.css)
  cream: new Color("#f8f6f3"), sage: new Color("#6b7c6a"), sageDark: new Color("#4a5a4a"),
  lilac: new Color("#d4c4e0"), muted: new Color("#7d8a7c"), good: new Color("#2f7d4a"), bad: new Color("#b0413e"),
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
function header(w, small, period) {
  const h = w.addStack(); h.centerAlignContent();
  const name = h.addText(small ? "IENN" : "Inland Empire Native Nursery");
  name.font = Font.boldSystemFont(small ? 15 : 13); name.textColor = C.sageDark; name.lineLimit = 1; name.minimumScaleFactor = 0.8;
  h.addSpacer();
  if (period !== "all") {
    const leg = h.addText(small ? `today · ${PERIODS[period][1]}` : `today  ·  ${PERIODS[period][0].toLowerCase()}`);
    leg.font = Font.mediumSystemFont(10); leg.textColor = C.muted; leg.lineLimit = 1;
  }
  const bar = w.addStack(); bar.size = new Size(0, 2); bar.backgroundColor = C.lilac; bar.cornerRadius = 1;   // lilac rule
  w.addSpacer(small ? 6 : 8);
}
function num(stack, m, key, font, color, star) {
  const v = val(m, key), t = stack.addText(fmtNum(v, m.unit) + (star && clipped(m, key) ? "*" : ""));
  t.font = font; t.textColor = colorFor(m.id, key, v) || color; t.lineLimit = 1; t.minimumScaleFactor = 0.6;
  return t;
}

function rowSmall(w, m, period) {
  const r = w.addStack(); r.centerAlignContent();
  const l = r.addText(m.label); l.font = Font.mediumSystemFont(12); l.textColor = C.sage; l.lineLimit = 1;
  r.addSpacer();
  num(r, m, "today", Font.boldRoundedSystemFont(17), C.sageDark);
  r.addSpacer(6);
  num(r, m, period, Font.mediumRoundedSystemFont(12), C.muted, true).rightAlignText();
}

function colMedium(row, m, period) {
  const c = row.addStack(); c.layoutVertically(); c.backgroundColor = Color.white(); c.cornerRadius = 10; c.setPadding(7, 9, 7, 9);
  const l = c.addText(m.label); l.font = Font.mediumSystemFont(11); l.textColor = C.sage; l.lineLimit = 1;
  num(c, m, "today", Font.boldRoundedSystemFont(24), C.sageDark);
  const k = c.addStack(); k.centerAlignContent();
  const pl = k.addText(PERIODS[period][1] + "  "); pl.font = Font.mediumSystemFont(11); pl.textColor = C.muted;
  num(k, m, period, Font.mediumRoundedSystemFont(11), C.muted, true);
  c.addSpacer();
}

// Medium 'all': label column + Today/7d/30d/QTD/YTD columns (fixed widths so the numbers line up).
const ALL_KEYS = ["today", "d7", "d30", "qtd", "ytd"], LABEL_W = 62, COL_W = 52;
function tableAll(w, ms) {
  const hr = w.addStack(); hr.centerAlignContent();
  const sp = hr.addStack(); sp.size = new Size(LABEL_W, 0);
  ALL_KEYS.forEach(k => { const c = hr.addStack(); c.size = new Size(COL_W, 0); c.addSpacer();
    const t = c.addText(PERIODS[k][1]); t.font = Font.semiboldSystemFont(10); t.textColor = C.muted; });
  w.addSpacer(3);
  ms.forEach(m => {
    const r = w.addStack(); r.centerAlignContent();
    const lc = r.addStack(); lc.size = new Size(LABEL_W, 0);
    const l = lc.addText(m.label); l.font = Font.mediumSystemFont(12); l.textColor = C.sage; l.lineLimit = 1; l.minimumScaleFactor = 0.7; lc.addSpacer();
    ALL_KEYS.forEach(k => { const c = r.addStack(); c.size = new Size(COL_W, 0); c.addSpacer();
      num(c, m, k, k === "today" ? Font.boldRoundedSystemFont(15) : Font.mediumRoundedSystemFont(13), k === "today" ? C.sageDark : C.muted, true); });
    w.addSpacer(4);
  });
}

function footer(w, res, ms, period) {
  w.addSpacer();
  const f = w.addStack(); f.centerAlignContent();
  let msg;
  if (res.data && res.data.updated) msg = `Updated ${timeLabel(res.data.updated)}`;
  if (res.stale) msg = `${res.error} · ${msg}`;
  else if (res.error) msg = res.error;
  if (res.data && res.data.partial && !res.stale) msg += " · some data missing";
  const keys = period === "all" ? ALL_KEYS : [period];
  const since = (ms || []).map(m => keys.map(k => clipped(m, k) && m.since[k]).find(Boolean)).find(Boolean);
  if (since) msg += ` · *from ${shortDate(since)}`;
  const t = f.addText(msg || ""); t.font = Font.systemFont(9); t.textColor = res.error ? C.bad : C.muted; t.lineLimit = 1; t.minimumScaleFactor = 0.7;
}
function shortDate(ymd) { const df = new DateFormatter(); df.dateFormat = "MMM d"; return df.string(new Date(ymd + "T12:00:00")); }

function build(res, family, param) {
  const small = family === "small", period = choosePeriod(param, small);
  const w = new ListWidget();
  w.backgroundColor = C.cream; w.url = SITE;
  w.setPadding(12, 14, 10, 14);
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);
  header(w, small, period);
  if (res.setup) {
    const t = w.addText("Open the script and paste ENDPOINT and KEY at the top."); t.font = Font.systemFont(12); t.textColor = C.sageDark;
    return w;
  }
  if (!res.data) {
    const t = w.addText(res.error === "Offline" ? "No connection yet — will retry." : res.error);
    t.font = Font.mediumSystemFont(13); t.textColor = C.sageDark;
    footer(w, res, [], period); return w;
  }
  const ms = (res.data.metrics || []).slice(0, 4);
  if (period === "all") tableAll(w, ms);
  else if (small) ms.forEach((m, i) => { if (i) w.addSpacer(4); rowSmall(w, m, period); });
  else { const row = w.addStack(); row.spacing = 8; ms.forEach(m => colMedium(row, m, period)); }
  footer(w, res, ms, period);
  return w;
}

// ---------- run ----------
const res = await load();
const family = config.runsInWidget ? config.widgetFamily : "medium";
const widget = build(res, family === "small" ? "small" : "medium", args.widgetParameter);
if (config.runsInWidget) Script.setWidget(widget);
else if (family === "small") await widget.presentSmall();
else await widget.presentMedium();
Script.complete();
