/* Shared shop settings (index.html + order.html). */
/* ===== IENN SETTINGS =====
   APPS_SCRIPT_URL: the existing IENN inventory/invoice web app (/exec). The page reads ?view=inventory from it
   and POSTs orders to it (see apps-script/ and README). Plants, stock and prices come from the inventory tool:
   adding a plant = add it to the tool's Catalog; stock = the weekly counts minus orders since the last count. */
var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec";
var REFRESH_MINUTES = 5;
/* "Only a few left" shows when a size has this many or fewer ready (never shows the number). */
var LOW_STOCK = 5;
/* Prices by size. Shown only until live data loads; the server (IENN_Config.gs IENN_SIZES) is authoritative. */
var PRICES = { '2"': 3, '4"': 6, 'Tree pot': 10, '1 gal': 15 };
var SIZE_LABELS = { '2"': "2-inch pot", '4"': "4-inch pot", 'Tree pot': "Quarter tree pot", '1 gal': "1-gallon" };
/* All prices INCLUDE tax ($3/$6/$10/$15 are final). The server backs tax out for its records only. */
var ON_REQUEST = "Available on request";   // 2" and Tree pot (not counted yet)
var CONTACT_PHONE = "(909) 609-9373", CONTACT_TEL = "+19096099373";   // Andrew, call/text fallback
/* Appeal sort (earlier keyword = shown first); plants with stock come first, not available last. */
/* Default order (an explicit feed/sheet rank still wins): popular + colorful first. */
var APPEAL_KEYWORDS = ["white sage", "salvia apiana", "sticky monkeyflower", "southern bush monkeyflower", "diplacus aurantiacus", "diplacus longiflorus", "rock monkeyflower", "diplacus calycinus",
  "monkeyflower", "mimulus", "diplacus", "california poppy", "eschscholzia", "showy penstemon", "penstemon spectabilis", "scarlet bugler",
  "penstemon centranthifolius", "matilija", "romneya", "milkweed", "asclepias", "penstemon", "poppy", "sage", "salvia", "buckwheat", "eriogonum",
  "lupine", "lupinus", "woolly blue curls", "trichostema", "ceanothus", "lilac", "yarrow", "achillea", "verbena", "aster", "fuchsia", "epilobium",
  "coreopsis", "sunflower", "encelia", "marigold", "baileya", "morning glory", "calystegia"];
/* OFFLINE FALLBACK ONLY (live inventory unreachable and nothing cached). Stock unknown -> "Available on request". */
var FALLBACK_PLANTS = [
  { name: "Blue Pyramid Cypress", sizes: ['1 gal'] },
  { name: "Woolly Blue Curls",    sizes: ['4"'] },
  { name: "Southern bush monkeyflower", botanical: "Diplacus longiflorus", sizes: ['1 gal'] },
  { name: "Yarrow",               sizes: ['4"'] }
];
/* No-show pickup policy (Eric-approved 2026-10-25). Shown in the checkout drawer above "Place order", on the thank-you ticket,
   and in "Pickup & payment" on order.html. Edit the wording here only; no hold time on purpose (pickup is Saturdays). */
/* Homepage "Starter packs coming soon" teaser: slides down once per visitor after this long on index.html (ms).
   Preview now with ?teaser=now. Shown-flag: localStorage "ienn-starter-teaser-seen". */
var STARTER_TEASER_DELAY_MS = 60000;
var STARTER_TEASER_COLOR = "lilac";   // "honey" | "lilac" | "sage" | "red" (same 3-D gloss/edge; preview any with ?teaser=now&teasercolor=red)
var PICKUP_POLICY = { lead: "Please pick up on time.",
  text: "We set your plants aside just for you. If you can't make your pickup, let us know ahead of time. Orders that aren't picked up are released, and the plants go back on sale." };
var ORDER_EMAIL = "plants@inlandempirenativenursery.com"; // mailto fallback only if the order endpoint fails
