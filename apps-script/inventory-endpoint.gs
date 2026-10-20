/**
 * IENN public inventory endpoint for the website order page (order.html).
 *
 * The existing customer order form (…/exec?view=customer) already loads inventory with the
 * server function getInitial(), which returns:
 *   { plants: ["Name (Botanical)", ...], sizes: [...], defaultPrices: { "<size>": price, taxPct }, stock: { "<plant>": { "<size>": qty } } }
 * This handler reuses that same function and exposes it read-only as JSON, so the
 * Inventory sheet stays the only place to edit plants and stock.
 *
 * SETUP (in the existing Apps Script project that serves ?view=customer):
 * 1. Paste this file into the project as a new file named inventory-endpoint.gs.
 * 2. In the existing doGet(e), add this as the FIRST line:
 *        if (e && e.parameter && e.parameter.view === 'inventory') return inventoryJson_();
 *    (Do not add a second doGet; Apps Script allows only one.)
 * 3. Deploy > Manage deployments > edit the current web app deployment > Version: New version > Deploy.
 *    Keep "Execute as: Me" and "Who has access: Anyone" (same as the customer form) so the URL stays the same.
 * 4. Open …/exec?view=inventory in a private window: you should see JSON, not an HTML page.
 *
 * OPTIONAL sheet columns (set the names below to match your Inventory tab, or leave blank):
 *   SORT_COLUMN  – a number per plant; lower = shown first on the website (overrides the keyword sort).
 *   PHOTO_COLUMN – a public image URL per plant.
 */
var INVENTORY_SHEET_NAME = 'Inventory';   // tab name in the IENN Inventory spreadsheet
var NAME_COLUMN = 'Plant';                 // header that holds the plant name as used in getInitial()
var SORT_COLUMN = '';                      // e.g. 'Sort' or 'Featured'
var PHOTO_COLUMN = '';                     // e.g. 'Photo'

function inventoryJson_() {
  var data = getInitial();                 // existing function used by the customer form
  var out = {
    plants: data.plants || [],
    sizes: data.sizes || [],
    defaultPrices: data.defaultPrices || {},
    stock: data.stock || {},
    updated: new Date().toISOString()
  };
  try {
    if (SORT_COLUMN || PHOTO_COLUMN) {
      var sh = SpreadsheetApp.getActive().getSheetByName(INVENTORY_SHEET_NAME);
      var rows = sh.getDataRange().getValues(), head = rows.shift();
      var n = head.indexOf(NAME_COLUMN), s = SORT_COLUMN ? head.indexOf(SORT_COLUMN) : -1, p = PHOTO_COLUMN ? head.indexOf(PHOTO_COLUMN) : -1;
      out.sort = {}; out.photos = {};
      rows.forEach(function (r) {
        if (!r[n]) return;
        if (s >= 0 && r[s] !== '') out.sort[r[n]] = Number(r[s]);
        if (p >= 0 && r[p]) out.photos[r[n]] = String(r[p]);
      });
    }
  } catch (err) { /* optional columns only; never break the endpoint */ }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
