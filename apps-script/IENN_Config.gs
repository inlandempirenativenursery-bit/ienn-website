/**
 * IENN website add-on for the EXISTING invoice/inventory Apps Script project (internal Index view + ?view=customer).
 * These files are ADDED to that project. They do not replace getInitial, getAvailableStock, submitInvoice or doGet.
 *
 * NOTE: the real project source was not available to us. Names and signatures below come from the live customer
 * page (which calls getInitial() and submitInvoice(data)) and from Eric's description. Every assumption is listed
 * here and in the README. Check them once against the real code.
 *
 * ASSUMED EXISTING FUNCTIONS
 *  S1. getInitial() -> { plants: ["Name (Botanical)", ...], sizes: ['2"','4"','Tree pot','1 gal'], defaultPrices: {...}, stock: {...} }
 *  S2. getAvailableStock() -> { "<plant name>": { '4"': n, '1 gal': n } }   (latest week's Submissions counts, summed)
 *  S3. submitInvoice(data) writes the order to "IENN Invoices" and emails the team (and the customer a copy). It throws on error.
 *      data = { date:'yyyy-mm-dd', paid:'unpaid', payment:'', customerEmail, discType:'none', discAmt:'', note,
 *               lines:[{ plant, size, qty:'2', amt:'12.00' }], subtotal:'12.00', tax:'1.05', grand:'13.05' }
 *      (exactly what the customer view sends). Its return value is used as the invoice number if it is a string/number
 *      or has invoiceNumber/invoiceNo/id/number.
 *
 * ASSUMED SHEET LAYOUT (spreadsheet "IENN Inventory")
 *  S4. Tab "Submissions": one row per person per weekly count, with a date/week column (header matched from
 *      SUBMISSION_DATE_HEADERS). The latest date found is the current count baseline.
 *  S5. Tab "Catalog": plant id -> common name (headers from CATALOG_*_HEADERS). Used so every catalog plant can be listed.
 *  S6. No new sheets are created. "Units sold since the latest count" is read from the existing IENN Invoices tab
 *      (rows dated after the latest Submissions date). Invoice columns are matched by the INVOICE_*_HEADERS below.
 *      Assumed: one row per invoice, with a lines column holding the submitted lines as JSON
 *      ([{plant,size,qty,amt}]) OR one row per line with Plant / Size / Qty columns. Check this against the real sheet.
 *  S7. Three columns are added to the right of IENN Invoices if missing: Status (New / Claimed / Paid / Picked up /
 *      Cancelled), Handled by, Our response. That is the only change to existing sheets. Submissions are never edited.
 */
var IENN_INVENTORY_SPREADSHEET_ID = '';   // '' = the spreadsheet this script is bound to; else the ID of "IENN Inventory"
var IENN_SUBMISSIONS_SHEET = 'Submissions';
var IENN_CATALOG_SHEET = 'Catalog';
var IENN_INVOICES_SPREADSHEET_ID = '';    // '' = same spreadsheet; else ID of the spreadsheet holding IENN Invoices
var IENN_INVOICES_SHEET = 'IENN Invoices';
var INVOICE_ID_HEADERS = ['invoice', 'invoice #', 'invoice no', 'invoice number', 'number', 'id', 'order id'];
var INVOICE_DATE_HEADERS = ['timestamp', 'created', 'submitted', 'date'];
var INVOICE_EMAIL_HEADERS = ['customer email', 'email', 'customeremail'];
var INVOICE_NOTE_HEADERS = ['note', 'notes'];
var INVOICE_LINES_HEADERS = ['lines', 'items', 'line items', 'lines json'];
var INVOICE_PLANT_HEADERS = ['plant', 'plant name'];
var INVOICE_SIZE_HEADERS = ['size'];
var INVOICE_QTY_HEADERS = ['qty', 'quantity'];
var INVOICE_PAID_HEADERS = ['paid', 'paid?'];
var INVOICE_PAYMENT_HEADERS = ['payment', 'payment method'];
var IENN_STATUS_COLUMNS = ['Status', 'Handled by', 'Our response'];   // added to IENN Invoices if missing
var IENN_STATUSES = ['New', 'Claimed', 'Paid', 'Picked up', 'Cancelled'];
var SUBMISSION_DATE_HEADERS = ['week', 'week of', 'week start', 'date', 'timestamp', 'submitted', 'submitted at'];
var CATALOG_ID_HEADERS = ['id', 'plant id', 'plantid'];
var CATALOG_NAME_HEADERS = ['name', 'common name', 'plant', 'plant name'];

/** Prices by size (confirmed by Eric). Keys are the size names the existing tool uses. */
var IENN_SIZES = [
  { key: '2"',       label: '2-inch pot',       price: 3,  tracked: false },
  { key: '4"',       label: '4-inch pot',       price: 6,  tracked: true  },
  { key: 'Tree pot', label: 'Quarter tree pot', price: 10, tracked: false },
  { key: '1 gal',    label: '1-gallon',         price: 15, tracked: true  }
];
var IENN_TAX_PCT = 8.75;                  // confirmed; same as the customer form
var IENN_MAX_QTY_PER_LINE = 99;

/** Team notification is done by the existing submitInvoice. Keep false to avoid a duplicate email.
    Set true (and fill the placeholders) only if submitInvoice turns out NOT to email the team. */
var IENN_EXTRA_TEAM_EMAIL = false;
var TEAM_EMAILS = [
  'ERIC_EMAIL_PLACEHOLDER@example.com',
  'ANDREW_EMAIL_PLACEHOLDER@example.com',
  'KEITH_EMAIL_PLACEHOLDER@example.com',
  'RAYLENE_EMAIL_PLACEHOLDER@example.com'
];

/** Customer reply drafts (never sent automatically). Keep {{...}} until confirmed. */
var PICKUP_ADDRESS = '{{PICKUP_ADDRESS}}';
var DEFAULT_PAYMENT_METHOD = '{{PAYMENT_METHOD}}';  // don't put a Zelle handle here until confirmed
var SIGN_OFF = 'Thank you for supporting native plants!\nInland Empire Native Nursery';
