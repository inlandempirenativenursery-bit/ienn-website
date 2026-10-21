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
 *               lines:[{ plant, size, qty:'2', amt:'12.00' }], subtotal:'11.03', tax:'0.97', grand:'12.00' }
 *      Line amt and grand INCLUDE tax (the existing tool backs tax out: subtotal = grand / 1.0875).
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
var IENN_INVENTORY_SPREADSHEET_ID = '1klPpRNuoNtdUDmCwpqYaQuQOKYvgku4AhKOFpTVR3Vw';   // '' = the spreadsheet this script is bound to; else the ID of "IENN Inventory"
var IENN_SUBMISSIONS_SHEET = 'Submissions';
var IENN_CATALOG_SHEET = 'Catalog';
var IENN_INVOICES_SPREADSHEET_ID = '1sGCDid99h7WsWsOrG2jyD2Nh9mprrNaS9dIV2vtS-Zs';    // '' = same spreadsheet; else ID of the spreadsheet holding IENN Invoices
var IENN_INVOICES_SHEET = 'Invoices';   // live invoice v4 tab name
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
var IENN_STATUSES = ['New', 'Claimed', 'Confirmed', 'Paid', 'Picked up', 'Cancelled'];
/* The exact pickup address is ONLY put in a reply draft once the order has one of these statuses (Andrew confirmed it). */
var IENN_CONFIRMED_STATUSES = ['Confirmed', 'Paid', 'Picked up'];
/* Checked in THIS order (first alias that has a readable date wins). Inventory v4 stores 'week' as '2026-W42' text and 'at' as epoch ms. */
var SUBMISSION_DATE_HEADERS = ['at', 'submitted at', 'timestamp', 'submitted', 'date', 'week', 'week of', 'week start'];
var CATALOG_ID_HEADERS = ['id', 'plant id', 'plantid'];
var CATALOG_NAME_HEADERS = ['name', 'common name', 'common', 'plant', 'plant name'];
var CATALOG_LATIN_HEADERS = ['latin', 'botanical', 'botanical name', 'scientific name'];   // optional; appended as "Name (Latin)"
/* Optional Catalog column: full image URL (or site-relative path) that overrides the website's assets/plants/<id>.jpg. Leave blank to use the local photo. */
var CATALOG_PHOTO_HEADERS = ['photo', 'photo url', 'image', 'image url', 'picture'];
/* Optional Catalog column "Pin" (or "Featured"): a number pins in that order (1 first); other text (yes, x) pins after the numbered ones.
   Blank / "no" / "n" / "false" = not pinned. iennSetup adds the "Pin" header if missing. */
var CATALOG_PIN_HEADERS = ['pin', 'pinned', 'featured'];
var IENN_PIN_HEADER = 'Pin';
/* Optional Catalog column "Badge": free text shown as a badge on the plant (feed field `badge`, '' when blank/missing). iennSetup adds the header if missing. */
var CATALOG_BADGE_HEADERS = ['badge'];
var IENN_BADGE_HEADER = 'Badge';
/* Popularity sort on the website: units ordered in the last N days (Invoices, Cancelled excluded). */
var IENN_POPULAR_DAYS = 90;

/** Prices by size (confirmed by Eric). Keys are the size names the existing tool uses. */
var IENN_SIZES = [
  { key: '2"',       label: '2-inch pot',       price: 3,  tracked: false },
  { key: '4"',       label: '4-inch pot',       price: 6,  tracked: true  },
  { key: 'Tree pot', label: 'Quarter tree pot', price: 10, tracked: false },
  { key: '1 gal',    label: '1-gallon',         price: 15, tracked: true  }
];
var IENN_TAX_PCT = 8.75;                  // prices INCLUDE tax; used only to back tax out for records (subtotal = total / 1.0875)
var IENN_ON_REQUEST_LABEL = 'Available on request';   // 2" and Tree pot (no counts yet; Eric will add them later)
var IENN_MAX_QTY_PER_LINE = 99;

/** Team notification is done by the existing submitInvoice. Keep false to avoid a duplicate email.
    Set true (and fill the placeholders) only if submitInvoice turns out NOT to email the team. */
var IENN_EXTRA_TEAM_EMAIL = true;   // live: one email To Andrew, CC Eric + Keith

/** Andrew owns order-to-pickup. New orders get Handled by = Andrew; the claim action defaults to Andrew. */
var IENN_ORDER_OWNER = 'Andrew';
var IENN_CONTACT_PHONE = '(909) 609-9373';      // Andrew: call/text fallback shown to customers
var IENN_CONTACT_TEL = '+19096099373';
/** New-order emails: Andrew is To (primary); Eric and Keith are CC. Raylene is not on order emails. */
var TEAM_EMAIL_TO = 'ANDREW_EMAIL_PLACEHOLDER@example.com';
var TEAM_EMAIL_CC = [
  'ERIC_EMAIL_PLACEHOLDER@example.com',
  'KEITH_EMAIL_PLACEHOLDER@example.com'
];
var TEAM_EMAILS = [TEAM_EMAIL_TO].concat(TEAM_EMAIL_CC);   // everyone on order emails (kept for compatibility)

/** Customer reply drafts (never sent automatically). Keep {{...}} until confirmed. */
/* EXACT addresses: used ONLY in the confirmed reply draft (iennConfirmAndDraft). Never in the website feed, the automatic
   customer email, the team alert or the print list. Fill these in Apps Script only, never in the public repo. */
var PICKUP_ADDRESS = '{{PICKUP_ADDRESS}}';
var PICKUP_ALT_ADDRESS = '{{PICKUP_ALT_ADDRESS}}'   // alternate, available on request;
var PICKUP_UNCONFIRMED_TEXT = 'Exact address sent once your order is confirmed';
var DEFAULT_PAYMENT_METHOD = 'Cash or Zelle at time of pickup';  // no Zelle handle until confirmed
var PICKUP_CITY = 'Fontana';
var PICKUP_AREA = 'Fontana area, near Sierra & Baseline, about 10 minutes from the 210';   // context only; exact address goes in PICKUP_ADDRESS once confirmed
var PAYMENT_TERMS = 'Cash or Zelle at time of pickup.';
var PICKUP_SCHEDULE = 'Saturdays 10 a.m. – 2 p.m.';
var PICKUP_FINE_PRINT = ['Other pickup times available case by case upon request.'];
var SIGN_OFF = 'Thank you for supporting native plants!\nInland Empire Native Nursery';

/* ---- Promos tab (website banner) ----
 * Tab "Promos" in this spreadsheet (iennSetup() creates it with example rows set to Active = No).
 * One promo per row. The website shows the FIRST row where Active = Yes and today (America/Los_Angeles)
 * falls within Start date .. End date, inclusive. A blank Start or End means open-ended. */
var IENN_PROMOS_SHEET = 'Promos';
var IENN_PROMO_TZ = 'America/Los_Angeles';
var PROMO_ACTIVE_HEADERS = ['active', 'on', 'enabled'];
var PROMO_TITLE_HEADERS = ['title', 'name'];
var PROMO_MESSAGE_HEADERS = ['message', 'text', 'body'];
var PROMO_START_HEADERS = ['start date', 'start', 'from'];
var PROMO_END_HEADERS = ['end date', 'end', 'until', 'to'];
var PROMO_DISCOUNT_HEADERS = ['discount note', 'discount', 'note'];
var PROMO_BOTTOM_HEADERS = ['bottom info', 'footer', 'info', 'details', 'fine print']; // optional footer strip on the banner; blank = IENN_PROMO_BOTTOM_DEFAULT
var IENN_PROMO_HEADERS = ['Active', 'Title', 'Message', 'Start date', 'End date', 'Discount note', 'Bottom info'];
/* Bottom info shown when a promo's "Bottom info" cell is blank. A new line or ' | ' starts a new line. */
var IENN_PROMO_BOTTOM_DEFAULT = 'Pickup Saturdays 10 a.m. – 2 p.m. in Fontana. | Cash or Zelle at time of pickup.';
/* Example rows (Active = No). Messages start with "EXAMPLE:" so iennSetup can tell untouched examples from real rows. No discounts. */
var IENN_PROMO_EXAMPLES = [
  ['No', 'Fall Sale', 'EXAMPLE: Plants are available now. Right now is the best time to get plants started.', '2026-11-01', '2026-11-30', '', IENN_PROMO_BOTTOM_DEFAULT],
  ['No', 'Spring Sale', 'EXAMPLE: Spring is the last window to get plants in before summer heat.', '2027-03-01', '2027-04-30', '', IENN_PROMO_BOTTOM_DEFAULT],
  ['No', 'Summer Sale', 'EXAMPLE: Summer is here. Pick up drought-tough natives for hot, dry gardens.', '2027-06-01', '2027-07-31', '', IENN_PROMO_BOTTOM_DEFAULT]
];
