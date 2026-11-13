/**
 * Hold / Cancel / Extend for orders (approved by Eric 2026-11-02).
 *  Links: <web app>?action=hold|cancel|extend&id=IEN-…[&r=noshow|customer]&t=<token>
 *  token = HMAC-SHA256('<action>[:<reason>]:<orderId>') keyed with IENN_CONFIRM_SECRET. Confirm signs the bare orderId
 *  (ids never contain ':'), so a Confirm token can never be replayed as Hold/Cancel/Extend and vice versa.
 *  Pickup : Status "Picked up" (closes the order; stock stays subtracted). Days: Script Properties HOLD_DAYS (7), NUDGE_DAYS_AFTER_PICKUP (3; Confirmed orders, counted from the first Saturday on/after the order date = the date in the customer email; orders before IENN_PICKUP_NUDGE_FROM skipped).
 *  Hold   : Status "On hold", Hold until = now + HOLD_DAYS (America/Los_Angeles).   Extend: Hold until = now + 7 days.
 *  Cancel : two steps (page with a "Yes, cancel" button, then &go=1) so a link preview can't cancel an order.
 *           Status "Cancelled" (stock math skips /cancel/i), Cancel reason "No-show – yyyy-MM-dd" or "Customer cancelled – yyyy-MM-dd". Row never cleared.
 *  Daily iennHoldCheck (installHoldTrigger, ~8 a.m. PT): one team reminder per expiry (To Andrew, CC Eric + Keith from IENN_Config),
 *  with Extend + Cancel links. Never emails customers; no customer email/phone/address and no pickup address.
 */
var IENN_HOLD_STATUS = 'On hold', IENN_CANCEL_STATUS = 'Cancelled', IENN_HOLD_DAYS = 7, IENN_HOLD_TZ = 'America/Los_Angeles', IENN_HOLD_HANDLER = 'iennHoldCheck';
var IENN_HOLD_UNTIL_HEADER = 'Hold until', IENN_CANCEL_REASON_HEADER = 'Cancel reason';
var IENN_CANCEL_REASONS = { noshow: 'No-show', customer: 'Customer cancelled' };
var IENN_HOLD_ACTIONS = { hold: true, cancel: true, extend: true, pickup: true };
var IENN_PICKUP_STATUS = 'Picked up', IENN_PICKUP_DATE_HEADERS = ['pickup date', 'pickup day'];
/* Pickup reminders only for orders placed on/after this Pacific date (shipped 2026-11-02), so older orders never get a burst. */
var IENN_PICKUP_NUDGE_FROM = '2026-11-02';
/** Pickup day = midnight (America/Los_Angeles) of the first Saturday on/after the order date: the same day the customer email shows (iennNextSaturday_). */
function iennPickupDay_(orderDate) {
  if (!orderDate) return null; var t = iennNextSaturdayUtc_(orderDate);
  return iennMetricsMidnight_(t.getUTCFullYear() + '-' + ('0' + (t.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + t.getUTCDate()).slice(-2));
}
function iennHoldNum_(k, def) { var v = PropertiesService.getScriptProperties().getProperty(k), n = Number(v); return v !== null && v !== '' && isFinite(n) && n > 0 ? n : def; }
function iennHoldDays_() { return iennHoldNum_('HOLD_DAYS', IENN_HOLD_DAYS); }
function iennNudgeDays_() { return iennHoldNum_('NUDGE_DAYS_AFTER_PICKUP', 3); }

function iennActionPayload_(action, id, reason) { return action + (action === 'cancel' ? ':' + reason : '') + ':' + id; }
function iennActionToken_(action, id, reason) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(iennActionPayload_(action, String(id), reason), iennConfirmSecret_())).replace(/=+$/, '');
}
function iennActionLink_(action, id, reason) {
  var base = iennWebAppUrl_(); if (!base) return '';
  return base + '?action=' + action + '&id=' + encodeURIComponent(id) + (action === 'cancel' ? '&r=' + reason : '') + '&t=' + encodeURIComponent(iennActionToken_(action, id, reason));
}
function iennHoldUntil_(now) { return new Date((now || new Date()).getTime() + iennHoldDays_() * 864e5); }
function iennHoldFmt_(d) { return Utilities.formatDate(d, IENN_HOLD_TZ, 'EEE MMM d, h:mm a'); }

/** Invoices plus the Hold until / Cancel reason column indexes. */
function iennHoldInvoices_() {
  var all = iennInvoices_(), head = all.sheet.getDataRange().getValues()[0] || [];
  all.cols.holdUntil = iennCol_(head, [IENN_HOLD_UNTIL_HEADER]); all.cols.cancelReason = iennCol_(head, [IENN_CANCEL_REASON_HEADER]); all.cols.pickupDate = iennCol_(head, IENN_PICKUP_DATE_HEADERS);
  if (all.cols.holdUntil < 0 || all.cols.cancelReason < 0) throw new Error('Hold until / Cancel reason column missing');
  var v = all.sheet.getDataRange().getValues();
  all.forEach(function (inv) { var r = v[inv.row - 1] || []; inv.holdUntil = iennDate_(r[all.cols.holdUntil]); inv.cancelReason = r[all.cols.cancelReason] || ''; inv.pickupDate = iennPickupDay_(inv.date); });
  return all;
}
function iennSetCell_(all, inv, col, val) { all.sheet.getRange(inv.row, all.cols[col] + 1).setValue(val); }

/** Core action: returns a data-free result { ok, orderId, status, until? } or { ok:false, error }. opt.now for tests. */
function iennHoldCore_(p, opt) {
  opt = opt || {}; var now = opt.now || new Date();
  var action = String(p.action || ''), id = String(p.id || ''), reason = String(p.r || '');
  if (!IENN_HOLD_ACTIONS[action] || !id || !/^[A-Za-z0-9-]{1,40}$/.test(id) || (action === 'cancel' && !IENN_CANCEL_REASONS[reason]) ||
      !iennSafeEqual_(p.t, iennActionToken_(action, id, reason))) return { ok: false, error: 'invalid' };
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return { ok: false, error: 'busy' };
  try {
    var all = iennHoldInvoices_(), inv = all.filter(function (x) { return String(x.id) === id; })[0]; if (!inv) return { ok: false, error: 'invalid' };
    var st = String(inv.status || 'New'), cancelled = /cancel/i.test(st), done = /^(paid|picked up)$/i.test(st);
    if (action === 'cancel') {
      if (cancelled) return { ok: true, orderId: id, status: 'already' };
      if (done) return { ok: false, orderId: id, error: 'done' };
      if (!opt.go) return { ok: true, orderId: id, status: 'ask', reason: IENN_CANCEL_REASONS[reason] };
      iennSetCell_(all, inv, 'status', IENN_CANCEL_STATUS);
      iennSetCell_(all, inv, 'cancelReason', IENN_CANCEL_REASONS[reason] + ' – ' + Utilities.formatDate(now, IENN_HOLD_TZ, 'yyyy-MM-dd'));
      iennSetCell_(all, inv, 'holdUntil', '');
      try { iennFeedBust_(); } catch (e) {}
      return { ok: true, orderId: id, status: 'cancelled' };
    }
    if (cancelled) return { ok: false, orderId: id, error: 'cancelled' };
    if (action === 'pickup') {
      if (st === IENN_PICKUP_STATUS) return { ok: true, orderId: id, status: 'alreadypicked' };
      iennSetCell_(all, inv, 'status', IENN_PICKUP_STATUS); iennSetCell_(all, inv, 'holdUntil', '');   // closes the order; stock stays subtracted
      return { ok: true, orderId: id, status: 'pickedup' };
    }
    if (done) return { ok: false, orderId: id, error: 'done' };   // Confirmed orders can be held (customer hasn't shown up yet); Paid / Picked up can't
    if (action === 'extend' && st !== IENN_HOLD_STATUS) return { ok: false, orderId: id, error: 'nothold' };
    var until = iennHoldUntil_(now);
    iennSetCell_(all, inv, 'status', IENN_HOLD_STATUS); iennSetCell_(all, inv, 'holdUntil', until);
    return { ok: true, orderId: id, status: action === 'extend' ? 'extended' : 'held', until: iennHoldFmt_(until) };
  } catch (err) {
    var code = iennErrCode_(String(err && err.message || err)); try { console.error('IENN ' + action + ' ' + id + ' [' + code + ']: ' + err); } catch (x) {}
    return { ok: false, error: code };
  } finally { lock.releaseLock(); }
}

/** doGet route for ?action=hold|cancel|extend (format=json for a site page). Generic page for any bad link; no order data. */
function iennHoldRoute_(p) {
  var r = iennHoldCore_(p, { go: p.go === '1' });
  if (p.format === 'json') return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
  var e = iennEsc_(r.orderId || '');
  if (r.ok && r.status === 'ask') {
    var go = iennActionLink_('cancel', r.orderId, p.r) + '&go=1';
    return iennConfirmPage_('Cancel order ' + e + '?', '<p>This marks it <b>Cancelled (' + iennEsc_(r.reason) + ')</b> and puts the plants back in the shop. Nothing is sent to the customer.</p>' +
      '<p><a href="' + iennEsc_(go) + '" target="_top" style="display:inline-block;padding:14px 20px;background:#c0392b;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Yes, cancel ' + e + '</a></p><p>Changed your mind? Just close this page.</p>');
  }
  if (r.ok && r.status === 'cancelled') return iennConfirmPage_('Order ' + e + ' cancelled', '<p>Order ' + e + ' is marked Cancelled and its plants are back in the shop. Nothing was sent to the customer.</p>');
  if (r.ok && r.status === 'pickedup') return iennConfirmPage_('Order ' + e + ' picked up', '<p>Order ' + e + ' is marked Picked up and closed. Nothing was sent to the customer.</p>');
  if (r.ok && r.status === 'alreadypicked') return iennConfirmPage_('Already picked up', '<p>Order ' + e + ' was already marked Picked up.</p>');
  if (r.ok && r.status === 'already') return iennConfirmPage_('Already cancelled', '<p>Order ' + e + ' was already cancelled.</p>');
  if (r.ok) return iennConfirmPage_('Order ' + e + (r.status === 'extended' ? ' hold extended' : ' on hold'), '<p>Order ' + e + ' is on hold until <b>' + iennEsc_(r.until) + '</b>. You can still Confirm it from the order email. We\'ll remind the team when the hold runs out.</p>');
  var msg = { invalid: 'This link is not valid or has expired. Please use the newest email, or call Eric.', busy: 'Please try again in a moment.',
    cancelled: 'Order ' + e + ' is Cancelled, so nothing was changed.', confirmed: 'Order ' + e + ' is already confirmed, so nothing was changed.',
    done: 'Order ' + e + ' is already paid or picked up, so nothing was changed.', nothold: 'Order ' + e + ' is not on hold, so nothing was changed.' }[r.error];
  return iennConfirmPage_(msg ? 'Nothing changed' : 'Something went wrong', '<p>' + (msg || 'Nothing was changed. Please try again or tell Eric.') + '</p>' + (msg ? '' : '<p style="color:#888;font-size:14px">Error code: ' + iennEsc_(r.error) + '</p>'));
}

/** First name only, from the "Website order — Name · phone" note (never email/phone). */
function iennFirstName_(note) { var m = /^Website order\s+[—-]\s+([^·\n]+)/.exec(String(note || '')); return m ? m[1].trim().split(/\s+/)[0] : ''; }
function iennTeamRecipients_() {
  var ok = function (a) { return a && !/PLACEHOLDER/i.test(a); };
  var to = ok(TEAM_EMAIL_TO) ? TEAM_EMAIL_TO : '', cc = TEAM_EMAIL_CC.filter(ok); if (!to && cc.length) to = cc.shift();
  return { to: to, cc: cc };
}

/** Daily (installHoldTrigger): one reminder per expired hold (property IENN_HOLD_REMINDED_<id> = hold-until ms). */
/** Trigger entry: wraps the run with a Script Property breadcrumb (IENN_LAST_HOLDCHECK) so runs can be checked without logs. */
function iennHoldCheck(opt) {
  var props = PropertiesService.getScriptProperties(), t0 = new Date(), crumb = function (s) { try { props.setProperty('IENN_LAST_HOLDCHECK', t0.toISOString() + ' ' + s); } catch (e) {} };
  crumb('start');
  try { var r = iennHoldCheckRun_(opt); crumb('end ' + JSON.stringify(r).slice(0, 400)); return r; }
  catch (e) { crumb('ERROR ' + String(e).slice(0, 400)); throw e; }
}
function iennHoldCheckRun_(opt) {
  opt = (opt && opt.now) ? opt : {}; var now = opt.now || new Date(), props = PropertiesService.getScriptProperties(), rc = iennTeamRecipients_(), sent = [];
  if (!rc.to) return { ok: false, error: 'no recipients' };
  iennHoldInvoices_().forEach(function (inv) {
    if (String(inv.status) !== IENN_HOLD_STATUS || !inv.holdUntil || inv.holdUntil > now) return;
    var key = 'IENN_HOLD_REMINDED_' + inv.id, mark = String(inv.holdUntil.getTime()); if (props.getProperty(key) === mark) return;
    var m = iennHoldReminder_(inv); MailApp.sendEmail({ to: rc.to, cc: rc.cc.join(','), subject: m.subject, body: m.text, htmlBody: m.html });
    props.setProperty(key, mark); sent.push(inv.id);
  });
  var nd = iennNudgeDays_();   // confirmed (not picked up) orders NUDGE_DAYS_AFTER_PICKUP days after their pickup date, if the sheet has one
  iennHoldInvoices_().forEach(function (inv) {
    if (String(inv.status) !== 'Confirmed' || !inv.pickupDate || inv.date < iennMetricsMidnight_(IENN_PICKUP_NUDGE_FROM)) return;   // not Paid / Picked up / Cancelled / On hold (held orders use the hold expiry)
    if (inv.pickupDate.getTime() + nd * 864e5 > now.getTime()) return;
    var key = 'IENN_PICKUP_NUDGED_' + inv.id, mark = String(inv.pickupDate.getTime()); if (props.getProperty(key) === mark) return;
    var m = iennPickupNudge_(inv, nd); MailApp.sendEmail({ to: rc.to, cc: rc.cc.join(','), subject: m.subject, body: m.text, htmlBody: m.html });
    props.setProperty(key, mark); sent.push(inv.id);
  });
  console.log('IENN holdCheck: reminders sent=' + sent.length + ', running tracker');
  var tracked = []; try { tracked = iennTrackerCheck_(now, rc).map(function (f) { return f.kind + ':' + f.id; }); } catch (e) { console.error('IENN tracker: ' + e); tracked = ['ERROR: ' + String(e).slice(0, 300)]; }
  return { ok: true, sent: sent, tracked: tracked };
}
function iennPickupNudge_(inv, nd) {
  var first = iennFirstName_(inv.note), who = inv.id + (first ? ' (' + first + ')' : ''), pu = iennActionLink_('pickup', inv.id), cn = iennActionLink_('cancel', inv.id, 'noshow');
  var day = Utilities.formatDate(inv.pickupDate, IENN_HOLD_TZ, 'EEE MMM d');
  var subject = 'Was ' + who + ' picked up? Mark Picked up or Cancel';
  var text = 'Order ' + who + ' was confirmed for pickup on ' + day + ' (' + nd + '+ days ago) and is not marked Picked up.\n\nPICKED UP: ' + pu + '\nCANCEL – NO-SHOW: ' + cn + '\n\nNothing is sent to the customer.';
  var E = iennEsc_, b = function (u, label, bg) { return '<a href="' + E(u) + '" style="display:inline-block;margin:4px 6px 4px 0;padding:12px 18px;background:' + bg + ';color:#fff;border-radius:10px;text-decoration:none;font-weight:700">' + label + '</a>'; };
  var html = '<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#2c2c2c;max-width:560px"><p>Order <b>' + E(who) + '</b> was confirmed for pickup on ' + E(day) + ' and is not marked Picked up.</p><p>' +
    b(pu, 'Picked up', '#4a6fa5') + b(cn, 'Cancel – no-show', '#c0392b') + '</p><p><small>Nothing is sent to the customer.</small></p></div>';
  return { subject: subject, text: text, html: html };
}
function iennHoldReminder_(inv) {
  var first = iennFirstName_(inv.note), who = inv.id + (first ? ' (' + first + ')' : ''), ext = iennActionLink_('extend', inv.id), cn = iennActionLink_('cancel', inv.id, 'noshow'), cc = iennActionLink_('cancel', inv.id, 'customer'), pu = iennActionLink_('pickup', inv.id);
  var items = inv.lines.map(function (l) { return l.qty + ' × ' + iennSplit_(l.plant)[0] + ' (' + l.size + ')'; });
  var subject = 'Still holding ' + who + '? Extend a week or Cancel';
  var text = 'The hold on order ' + who + ' ran out on ' + iennHoldFmt_(inv.holdUntil) + '.\n\n' + items.map(function (x) { return '  ' + x; }).join('\n') +
    '\n\nEXTEND A WEEK: ' + ext + '\nPICKED UP: ' + pu + '\nCANCEL – NO-SHOW: ' + cn + '\nCANCEL – CUSTOMER CANCELLED: ' + cc + '\n\nCancelling puts the plants back in the shop. Nothing is sent to the customer.';
  var E = iennEsc_, b = function (u, label, bg) { return '<a href="' + E(u) + '" style="display:inline-block;margin:4px 6px 4px 0;padding:12px 18px;background:' + bg + ';color:#fff;border-radius:10px;text-decoration:none;font-weight:700">' + label + '</a>'; };
  var html = '<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#2c2c2c;max-width:560px"><p>The hold on order <b>' + E(who) + '</b> ran out on ' + E(iennHoldFmt_(inv.holdUntil)) + '.</p><ul>' +
    items.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul><p>' + b(ext, 'Extend a week', '#6b8f6b') + b(pu, 'Picked up', '#4a6fa5') + b(cn, 'Cancel – no-show', '#c0392b') + b(cc, 'Cancel – customer cancelled', '#c0392b') +
    '</p><p><small>Cancelling puts the plants back in the shop. Nothing is sent to the customer.</small></p></div>';
  return { subject: subject, text: text, html: html };
}

/** Idempotent: exactly one daily ~8 a.m. America/Los_Angeles trigger for iennHoldCheck. */
function installHoldTrigger() {
  var tz = Session.getScriptTimeZone(); if (tz !== IENN_HOLD_TZ) throw new Error('Project timezone is ' + tz + ', expected ' + IENN_HOLD_TZ);
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === IENN_HOLD_HANDLER) { ScriptApp.deleteTrigger(t); removed++; } });
  ScriptApp.newTrigger(IENN_HOLD_HANDLER).timeBased().everyDays(1).atHour(8).inTimezone(IENN_HOLD_TZ).create();
  return { ok: true, timezone: tz, removed: removed, holdTriggers: ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === IENN_HOLD_HANDLER; }).length };
}
