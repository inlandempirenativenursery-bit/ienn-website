/* Plant photos (Eric-approved picks, see docs/photo-credits.md). Key = slug of the common name, matched case-insensitively.
   No entry => leaf placeholder (Woollypod milkweed: catalogue showy/woollypod files may be swapped, held back until Eric confirms). */
var IENN_PHOTOS = ["white-sage","sticky-monkeyflower","narrow-leaf-milkweed","black-sage","california-buckwheat","california-encelia","california-poppy","desert-marigold","matilija-poppy","morning-glory","rock-monkeyflower","scarlet-bugler","showy-penstemon","sugarbush","yarrow","deergrass","showy-milkweed","yucca","toyon","woolly-blue-curls"];
var IENN_PHOTO_ALIAS = { "narrowleaf-milkweed": "narrow-leaf-milkweed", "buckwheat": "california-buckwheat", "encelia": "california-encelia", "bush-sunflower": "california-encelia", "poppy": "california-poppy", "matilija": "matilija-poppy", "bunch-grass-deer": "deergrass", "deer-grass": "deergrass", "chaparral-yucca": "yucca", "our-lord-s-candle": "yucca", "monkeyflower": "sticky-monkeyflower", "penstemon": "showy-penstemon", "wild-morning-glory": "morning-glory", "island-morning-glory": "morning-glory" };
/* Photos that need a visible attribution on the card (e.g. CC BY). */
var IENN_PHOTO_CREDITS = {};
function ienPhoto(name) { var k = String(name || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); k = IENN_PHOTO_ALIAS[k] || k;
  return IENN_PHOTOS.indexOf(k) < 0 ? null : { src: "assets/plants/" + k + ".jpg", srcset: "assets/plants/" + k + "-400.jpg 400w, assets/plants/" + k + ".jpg 800w", credit: IENN_PHOTO_CREDITS[k] || null }; }
if (typeof module !== "undefined") module.exports = { ienPhoto: ienPhoto, IENN_PHOTO_CREDITS: IENN_PHOTO_CREDITS, IENN_PHOTOS: IENN_PHOTOS };
