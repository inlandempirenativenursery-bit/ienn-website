/**
 * IENN Inventory -> website JSON feed (sample; adapt to the real inventory script).
 *
 * The existing IENN web app already has getInitial() returning
 *   { plants: [...names], sizes: [...], defaultPrices: {...}, stock: { "<plant>": { '4"': n, '1 gal': n } } }
 * order.html understands that shape directly, so the smallest change is to add a
 * JSON branch to the EXISTING doGet (do not replace the customer/invoice views):
 *
 *   function doGet(e) {
 *     if (e && e.parameter && e.parameter.view === 'json') {
 *       var data = getInitial();
 *       data.updated = new Date().toISOString();
 *       delete data.defaultPrices; // optional: keep prices off the public feed until confirmed
 *       return ContentService.createTextOutput(JSON.stringify(data))
 *         .setMimeType(ContentService.MimeType.JSON);
 *     }
 *     ... existing doGet code unchanged ...
 *   }
 *
 * Then redeploy (Deploy > Manage deployments > edit > New version; access "Anyone")
 * and set INVENTORY_URL in order.html to  https://script.google.com/macros/s/<id>/exec?view=json
 *
 * If you'd rather have a richer feed (notes, photos, rank, featured, active), use
 * inventoryFeed_() below on a sheet tab laid out as documented in TESTING.md.
 */
var INVENTORY_SHEET = 'Inventory'; // [TODO confirm tab name]

function inventoryFeed_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(INVENTORY_SHEET);
  var values = sh.getDataRange().getValues();
  var head = values.shift().map(function (h) { return String(h).trim().toLowerCase(); });
  function col(name) { return head.indexOf(name); }
  var rows = values.filter(function (r) { return r[col('name')]; }).map(function (r) {
    var o = {};
    ['name', 'size', 'stock', 'note', 'image', 'rank', 'featured', 'active'].forEach(function (k) {
      if (col(k) >= 0) o[k] = r[col(k)];
    });
    return o;
  });
  return { updated: new Date().toISOString(), plants: rows };
}

// Use instead of getInitial() in the view=json branch above for the richer feed:
//   return ContentService.createTextOutput(JSON.stringify(inventoryFeed_())).setMimeType(ContentService.MimeType.JSON);
