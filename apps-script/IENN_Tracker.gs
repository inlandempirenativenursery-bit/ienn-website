/**
 * Order & fulfillment tracker (2026-11-06). Runs inside the daily 8 a.m. iennHoldCheck (no new trigger).
 *  - Unconfirmed: Status exactly "New" more than TRACK_UNCONFIRMED_HOURS (24) after the order Timestamp.
 *  - Note needs reply: website order with customer-written text in Note (not Pickup/Pays by/REQUEST lines) and "Our response" blank.
 *  - Active hold: Status "On hold" with a Hold until date. Flagged once when the hold is set; rematerializes if Hold until changes (Extend).
 *  - Hold soon: On hold and Hold until within TRACK_HOLD_SOON_HOURS (24) — second ping ~1 day before expiry (once per Hold until value).
 *  - Unconfirmed pickup: Status "Confirmed", order date on/after IENN_PICKUP_NUDGE_FROM, and now past the pickup Saturday (same iennPickupDay_ as the nudge). Once per pickup Saturday.
 *  Skips Cancelled / Paid / Picked up. Hold-expiry reminder and pickup-nudge action emails stay in iennHoldCheck (not repeated here).
 *  Dedupe: Script Property IENN_TRACK_<kind>_<id>. Kinds with a mark (hold / hold_soon / pickup) store the mark (holdUntil or pickupDate ms) so an Extend re-flags.
 *  One combined team email only when something is new. To Andrew, CC Eric + Keith.
 *  Privacy: order id + first name + plant lines only — no customer email/phone, note body, or pickup address.
 *  To clear a note flag for good, write anything in "Our response".
 */
function iennTrackNoteText_(note) {
  var ls = String(note || '').split('\n'); if (!/^Website order/.test(ls[0] || '')) return '';
  return ls.slice(1).filter(function (l) { return !/^(Pickup|Pays by|REQUEST):/i.test(l.trim()); }).join(' ').trim();
}
function iennTrackItems_(inv) {
  return (inv.lines || []).map(function (l) { return l.qty + ' × ' + iennSplit_(l.plant)[0] + ' (' + l.size + ')'; }).join(', ');
}
function iennTrackDaysLeft_(until, now) {
  if (!until) return 0;
  return Math.max(0, Math.floor((until.getTime() - now.getTime()) / 864e5));
}
function iennTrackFlags_(invs, now) {
  var hrs = iennHoldNum_('TRACK_UNCONFIRMED_HOURS', 24);
  var soonHrs = iennHoldNum_('TRACK_HOLD_SOON_HOURS', 24);
  var out = [];
  invs.forEach(function (inv) {
    var st = String(inv.status || 'New');
    if (/cancel/i.test(st) || /^(paid|picked up)$/i.test(st)) return;
    var who = inv.id + (iennFirstName_(inv.note) ? ' (' + iennFirstName_(inv.note) + ')' : '');
    var items = iennTrackItems_(inv);
    if (st === IENN_HOLD_STATUS && inv.holdUntil) {
      var untilTxt = iennHoldFmt_(inv.holdUntil);
      var days = iennTrackDaysLeft_(inv.holdUntil, now);
      var mark = String(inv.holdUntil.getTime());
      out.push({ kind: 'hold', id: inv.id, mark: mark,
        text: who + ' – On hold until ' + untilTxt + ' (' + days + ' day' + (days === 1 ? '' : 's') + ' left)' + (items ? '; ' + items : '') });
      if (inv.holdUntil > now && inv.holdUntil.getTime() - now.getTime() <= soonHrs * 36e5)
        out.push({ kind: 'hold_soon', id: inv.id, mark: mark,
          text: who + ' – hold ends ' + untilTxt + ' (~' + Math.max(1, Math.ceil((inv.holdUntil.getTime() - now.getTime()) / 36e5)) + ' h)' + (items ? '; ' + items : '') });
    }
    if (st === 'Confirmed' && inv.pickupDate && inv.date && inv.date >= iennMetricsMidnight_(IENN_PICKUP_NUDGE_FROM) &&
        now.getTime() > inv.pickupDate.getTime()) {
      var day = Utilities.formatDate(inv.pickupDate, IENN_HOLD_TZ, 'EEE MMM d');
      out.push({ kind: 'pickup', id: inv.id, mark: String(inv.pickupDate.getTime()),
        text: who + ' – Confirmed, past pickup Saturday (' + day + ')' + (items ? '; ' + items : '') });
    }
    if (st === 'New' && inv.date && now.getTime() - inv.date.getTime() > hrs * 36e5)
      out.push({ kind: 'unconfirmed', id: inv.id, text: who + ' – still New, placed ' + iennHoldFmt_(inv.date) });
    if (iennTrackNoteText_(inv.note) && !String(inv.response || '').trim())
      out.push({ kind: 'note', id: inv.id, text: who + ' – customer note has no reply in "Our response"' });
  });
  return out;
}
function iennTrackFresh_(flags, props) {
  return flags.filter(function (f) {
    var prev = props.getProperty('IENN_TRACK_' + f.kind + '_' + f.id);
    if (f.mark != null) return prev !== String(f.mark);
    return !prev;
  });
}
function iennTrackEmailBody_(fresh) {
  var sec = function (t, a) { return a.length ? t + '\n' + a.map(function (f) { return '  • ' + f.text; }).join('\n') + '\n\n' : ''; };
  return sec('Active holds:', fresh.filter(function (f) { return f.kind === 'hold'; })) +
    sec('Holds ending within ~1 day:', fresh.filter(function (f) { return f.kind === 'hold_soon'; })) +
    sec('Confirmed, past pickup Saturday:', fresh.filter(function (f) { return f.kind === 'pickup'; })) +
    sec('Not confirmed after 24 hours:', fresh.filter(function (f) { return f.kind === 'unconfirmed'; })) +
    sec('Customer notes waiting for a reply:', fresh.filter(function (f) { return f.kind === 'note'; })) +
    'Open the order sheet to follow up. Nothing is sent to customers.';
}
/** Called from iennHoldCheck. Returns flags flagged now. opt.dry = no email, no marks. */
function iennTrackerCheck_(now, rc, opt) {
  opt = opt || {}; var props = PropertiesService.getScriptProperties();
  var invs = iennHoldInvoices_(), all = iennTrackFlags_(invs, now), fresh = iennTrackFresh_(all, props);
  try { console.log('IENN tracker: ' + invs.length + ' orders, flags=' + all.map(function (f) { return f.kind + ':' + f.id; }).join(',') + ' new=' + fresh.length + (opt.dry ? ' (dry)' : '') + ' to=' + !!(rc && rc.to)); } catch (e) {}
  if (!fresh.length || opt.dry) return fresh;
  var text = iennTrackEmailBody_(fresh);
  var html = '<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#2c2c2c;max-width:560px">' + iennEsc_(text).replace(/\n/g, '<br>') + '</div>';
  MailApp.sendEmail({ to: rc.to, cc: rc.cc.join(','), subject: 'IENN orders to follow up (' + fresh.length + ')', body: text, htmlBody: html });
  try { console.log('IENN tracker: email sent (' + fresh.length + ')'); } catch (e) {}
  fresh.forEach(function (f) { props.setProperty('IENN_TRACK_' + f.kind + '_' + f.id, f.mark != null ? String(f.mark) : String(now.getTime())); });
  return fresh;
}
