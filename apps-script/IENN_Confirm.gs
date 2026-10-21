/**
 * IENN one-tap "Confirm order" link (in Andrew's new-order alert). Andrew never opens the script editor.
 *   GET <web app>/exec?action=confirm&id=IEN-…&t=<token>
 * token = HMAC-SHA256(orderId) keyed with Script Property IENN_CONFIRM_SECRET (auto-created on first use).
 * The web app runs as the owner (nursery account), so the thank-you DRAFT lands in that Gmail. It is never sent.
 */
var IENN_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec';   // the ONE live deployment; always preferred (getUrl() can return /dev or an old deployment)
var IENN_DRAFTS_URL = 'https://mail.google.com/mail/#drafts';
var IENN_DRAFTS_ACCOUNT = 'NURSERY_ACCOUNT_PLACEHOLDER@example.com';

function iennConfirmSecret_() {
  var props = PropertiesService.getScriptProperties(), s = props.getProperty('IENN_CONFIRM_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('IENN_CONFIRM_SECRET', s); }
  return s;
}
function iennConfirmToken_(orderId) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(orderId), iennConfirmSecret_())).replace(/=+$/, '');
}
function iennSafeEqual_(a, b) {   // constant time for equal-length strings
  a = String(a == null ? '' : a); b = String(b == null ? '' : b);
  if (!a || a.length !== b.length) return false;
  var diff = 0; for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function iennWebAppUrl_() {
  if (IENN_WEBAPP_URL && !/\/dev$/.test(IENN_WEBAPP_URL)) return IENN_WEBAPP_URL;
  var u = ''; try { u = ScriptApp.getService().getUrl() || ''; } catch (e) { u = ''; }
  return /\/dev$/.test(u) ? '' : u;   // never hand out a /dev link
}
function iennConfirmLink_(orderId) {
  var base = iennWebAppUrl_(); if (!base) return '';
  return base + '?action=confirm&id=' + encodeURIComponent(orderId) + '&t=' + encodeURIComponent(iennConfirmToken_(orderId));
}

function iennConfirmPage_(title, html) {
  return HtmlService.createHtmlOutput('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 18px;color:#2c2c2c;font-size:17px;line-height:1.5">' +
    '<h1 style="color:#4a5a4a;font-size:22px">' + title + '</h1>' + html + '</body></html>').setTitle('IENN — ' + title);
}
function iennDraftsButton_() {
  return '<p><a href="' + IENN_DRAFTS_URL + '" target="_top" style="display:inline-block;padding:14px 20px;background:#6b8f6b;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Open Gmail Drafts</a></p>';
}

/** doGet route for ?action=confirm. Generic error page for any bad link: no order data is shown. */
function iennConfirmRoute_(p) {
  var id = String(p.id || ''), bad = function () { return iennConfirmPage_('Link not valid', '<p>This confirm link is not valid or has expired. Please use the button in the newest order email, or call Eric.</p>'); };
  if (!id || !/^[A-Za-z0-9-]{1,40}$/.test(id) || !iennSafeEqual_(p.t, iennConfirmToken_(id))) return bad();
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return iennConfirmPage_('Busy', '<p>Please try the button again in a moment.</p>');
  try {
    var inv = iennInvoices_().filter(function (x) { return String(x.id) === id; })[0]; if (!inv) return bad();
    var props = PropertiesService.getScriptProperties(), key = 'IENN_DRAFT_' + id, e = iennEsc_(id);
    var confirmed = IENN_CONFIRMED_STATUSES.indexOf(String(inv.status)) >= 0;
    var drafted = ''; try { drafted = props.getProperty(key) || ''; } catch (pe) { drafted = ''; }
    if (confirmed && drafted) return iennConfirmPage_('Already confirmed', '<p>Order ' + e + ' was already confirmed. Check Drafts in Gmail (' + IENN_DRAFTS_ACCOUNT + ') for the thank-you email.</p>' + iennDraftsButton_());
    if (/cancel/i.test(String(inv.status))) return iennConfirmPage_('Order cancelled', '<p>Order ' + e + ' is marked Cancelled, so nothing was changed.</p>');
    iennConfirmAndDraft(id);   // Status = Confirmed + Gmail DRAFT (never sent); records the draft
    return iennConfirmPage_('Order ' + e + ' confirmed', '<p>Order ' + e + ' confirmed. The thank-you email is in Gmail Drafts (' + IENN_DRAFTS_ACCOUNT + '): open it, add a personal touch, press Send.</p>' + iennDraftsButton_());
  } catch (err) {
    var msg = String(err && err.message || err), code = iennErrCode_(msg);
    try { console.error('IENN confirm ' + id + ' [' + code + ']: ' + msg + (err && err.stack ? '\n' + err.stack : '')); } catch (x) {}
    try { Logger.log('IENN confirm ' + id + ' [' + code + ']: ' + msg); } catch (x) {}
    return iennConfirmPage_('Something went wrong', '<p>Nothing was sent and the order was not marked Confirmed. Please try again or tell Eric.</p><p style="color:#888;font-size:14px">Error code: ' + code + '</p>');
  }
  finally { lock.releaseLock(); }
}

/** Short, data-free error code for the page; the full message goes to the execution log only. */
function iennErrCode_(msg) {
  msg = String(msg || '');
  if (/permission|authoriz|scope|gmail/i.test(msg)) return 'E_GMAIL_AUTH';
  if (/E_NO_EMAIL/.test(msg)) return 'E_NO_EMAIL';
  if (/not found/i.test(msg)) return 'E_NOT_FOUND';
  if (/Status column/i.test(msg)) return 'E_SHEET';
  var h = 0; for (var i = 0; i < msg.length; i++) h = (h * 31 + msg.charCodeAt(i)) | 0;
  return 'E_' + ('0000' + (h >>> 0).toString(36)).slice(-4).toUpperCase();
}
