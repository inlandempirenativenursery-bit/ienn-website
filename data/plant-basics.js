/* Plant basics for the card's swipe panel. Original wording; general horticultural knowledge, kept conservative.
   Keyed by genus (from the botanical name) with optional per-species overrides in IENN_BASICS_SPECIES (merged over the genus).
   water: 1 = about monthly, 2 = twice a month, 3 = weekly (once established, after year one); or a range [min,max], e.g. [1,2] = "Low–moderate"
   sun: "full" | "part" | "shade"   soil: "Fast-draining" | "Clay-tolerant" | "Adaptable"
   bloom: any of "W","Sp","Su","F"   wild: "pollinators","butterflies","hummingbirds","birds","fragrant","containers"
   h/w: mature size in feet [min,max]   ie: thrives in Inland Empire heat   genusLevel: true = genus-level info, not species-specific */
var IENN_BASICS = {
  Salvia: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","birds","fragrant"], h:[3,5], w:[3,5], ie:true, genusLevel:true,
    desc:"California sages are aromatic, drought-hardy shrubs that bees love. Give them sun and good drainage, then mostly leave them alone in summer." },
  Eriogonum: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su","F"], wild:["pollinators","birds"], h:[2,4], w:[3,5], ie:true, genusLevel:true,
    desc:"Buckwheats are tough, low-water shrubs with long-lasting flower clusters that fade to rust in fall. A top plant for native bees and butterflies." },
  Hesperoyucca: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators"], h:[2,12], w:[2,4], ie:true,
    desc:"A spiky rosette of blue-gray leaves that sends up one tall stalk of creamy flowers, then the plant finishes. Plant it away from paths." },
  Baileya: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su","F"], wild:["pollinators","containers"], h:[1,1.5], w:[1,1.5], ie:true,
    desc:"Silvery leaves and bright yellow daisies for months. Short-lived but often reseeds; give it heat, sun and sharp drainage." },
  Calystegia: { water:2, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su"], wild:["pollinators"], h:[3,10], w:[3,6], ie:true, genusLevel:true,
    desc:"A vigorous native vine with large white to pale-pink trumpet flowers. Let it climb a fence or ramble over a slope." },
  Encelia: { water:1, sun:["full"], soil:"Fast-draining", bloom:["W","Sp"], wild:["pollinators","birds"], h:[3,4], w:[3,5], ie:true, genusLevel:true,
    desc:"A fast, rounded shrub covered in cheerful yellow daisies from late winter into spring. Very forgiving and quick to fill space." },
  Eschscholzia: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","containers"], h:[1,1.5], w:[1,1.5], ie:true,
    desc:"The state flower: silky orange cups that open in sun and close at night. Often reseeds for next year's show." },
  Muhlenbergia: { water:2, sun:["full","part"], soil:"Adaptable", bloom:["Su","F"], wild:["birds"], h:[3,4], w:[3,4], ie:true,
    desc:"A big, fountain-shaped bunchgrass with tall slender flower spikes. Great for structure, slopes and erosion control." },
  Romneya: { shape:"Shrub", water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators"], h:[5,8], w:[5,10], ie:true,
    desc:"Huge white flowers like fried eggs on tall blue-gray stems. It spreads by roots once happy, so give it room and little summer water." },
  Asclepias: { water:2, sun:["full"], soil:"Adaptable", bloom:["Su"], wild:["pollinators"], h:[2,3], w:[1,3], ie:true, genusLevel:true,
    desc:"Native milkweed is the host plant monarch caterpillars need. It dies back in winter and returns in spring; leave the caterpillars be." },
  Diplacus: { water:1, sun:["full","part"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","containers"], h:[2,4], w:[2,3], ie:true, genusLevel:true,
    desc:"Monkeyflowers bloom heavily in spring with tubular flowers hummingbirds visit. Afternoon shade and little summer water keep them happy." },
  Penstemon: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","containers"], h:[2,4], w:[1,3], ie:true, genusLevel:true,
    desc:"Upright spikes of tubular flowers that hummingbirds find fast. Needs good drainage; avoid overwatering." },
  Rhus: { shape:"SmallTree", water:1, sun:["full","part"], soil:"Adaptable", bloom:["W","Sp"], wild:["pollinators","birds"], h:[7,15], w:[7,15], ie:true,
    desc:"A sturdy evergreen shrub with glossy leaves and small pink-white flowers. Useful as a hedge or screen once established." },
  Achillea: { water:2, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su"], wild:["pollinators","fragrant","containers"], h:[1,3], w:[1,3], ie:true,
    desc:"Feathery, aromatic leaves with flat clusters of small flowers. Spreads into a soft patch and can even be mowed as a lawn alternative." },
  Datura: { water:1, sun:["full"], soil:"Adaptable", bloom:["W","Sp","Su","F"], wild:["pollinators","fragrant"], h:[1,5], w:[3,6], ie:true,
    desc:"Large white trumpet flowers open in the evening for night-flying moths. All parts are toxic if eaten, so plant it away from kids and pets." },
  Artemisia: { water:1, sun:["full"], soil:"Fast-draining", bloom:["F"], wild:["birds","fragrant"], h:[3,5], w:[3,5], ie:true,
    desc:"Soft, silvery-gray foliage with the classic scent of the coastal sage scrub. Excellent cover for small birds." },
  Trichostema: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","fragrant"], h:[3,5], w:[3,5], ie:true,
    desc:"Woolly purple flower spikes and a strong, pleasant scent. Needs sharp drainage and almost no summer water once established." },
  Baccharis: { water:1, sun:["full","part"], soil:"Adaptable", bloom:["F"], wild:["pollinators","birds"], h:[1,3], w:[4,8], ie:true,
    desc:"A tough evergreen shrub or groundcover that handles almost any soil. Its fall flowers feed many insects late in the year." },
  Epilobium: { water:1, sun:["full","part"], soil:"Fast-draining", bloom:["Su","F"], wild:["hummingbirds","pollinators","containers"], h:[1,2], w:[2,3], ie:true,
    desc:"Bright red-orange tubular flowers in late summer and fall, just when hummingbirds need them most. Cut back in winter to keep it tidy." },
  Hesperocyparis: { water:1, sun:["full"], soil:"Adaptable", bloom:[], wild:["birds","fragrant"], h:[20,40], w:[10,20], ie:true,
    desc:"A drought-tolerant evergreen conifer with blue-gray, aromatic foliage. Makes a strong vertical accent or windbreak." },
  Dendromecon: { shape:"SmallTree", water:1, sun:["full"], soil:"Fast-draining", bloom:["W","Sp"], wild:["pollinators"], h:[4,8], w:[4,8], ie:true,
    desc:"A chaparral shrub with bright yellow poppy flowers. Needs excellent drainage and dislikes summer water." },
  Heteromeles: { water:1, sun:["full","part"], soil:"Adaptable", bloom:["Su"], wild:["pollinators","birds"], h:[8,15], w:[6,12], ie:true,
    desc:"An evergreen shrub with white summer flowers and bright red winter berries that birds love. A classic native hedge or small tree." },
  /* Added 2026-10-25 (Calscape-verified, see docs/factcheck-2026-10-25.md) */
  Atriplex: { water:1, sun:["full"], soil:"Adaptable", bloom:["W","Sp","Su","F"], wild:["birds","pollinators"], h:[1,10], w:[3,7], ie:true, genusLevel:true,
    desc:"A tough gray-green shrub with small yellow-green flowers and showy clusters of papery four-winged fruit. Handles salty, alkaline or clay soil; keep it dry." },
  Acmispon: { water:1, sun:["full"], soil:"Adaptable", bloom:["Sp","Su"], wild:["pollinators"], h:[2,3], w:[3,3], ie:true, genusLevel:true,
    desc:"Wiry green stems covered in small yellow pea flowers that age to red. Fast and airy; cut back in late summer or fall for fresh growth." },
  Sphaeralcea: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","containers"], h:[3,5], w:[2,4], ie:true, genusLevel:true,
    desc:"Fuzzy gray-green leaves and bowl-shaped apricot-orange flowers. Loves heat and sharp drainage; prune after bloom to keep it compact." },
  /* Added 2026-10-25b (see docs/factcheck-2026-10-25b.md). Feed row: Catalog id "grama" = Bouteloua gracilis. (Buffalo grass, id "buffalograss", is hidden: not CA native, Eric 2026-10-25.) */
  Bouteloua: { water:1, sun:["full","part"], soil:"Fast-draining", bloom:["Su","F"], wild:["pollinators","containers"], h:[0.5,2], w:[2,2], ie:true, genusLevel:true,
    desc:"A fine-textured, low-water bunchgrass with eyelash-shaped seed heads held above the blades. Goes tan when dormant in winter." },
  Erythranthe: { water:3, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su","F"], wild:["hummingbirds","pollinators","containers"], h:[2,3], w:[3,3], ie:false, genusLevel:true,
    desc:"Bright red-orange tubular flowers over soft, toothed leaves. Likes regular water and some afternoon shade; deadhead for more blooms." },
  /* Added 2026-10-28 (see docs/factcheck-2026-10-28.md). Feed row: Catalog id "stipa" = Stipa pulchra, Purple needlegrass (syn. Nassella pulchra, mapped via IENN_BASICS_ALIAS). */
  Stipa: { water:1, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su"], wild:["birds","butterflies"], h:[2,3], w:[1,2], ie:true, genusLevel:true,
    desc:"A fine-textured, low-water bunchgrass with airy, nodding seed heads. Goes golden and dormant in summer." }
};
var IENN_BASICS_SPECIES = {
  "Salvia apiana": { h:[3,5], w:[3,8], bloom:["Sp","Su"], desc:"Striking silver-white leaves with a strong fragrance and tall flower wands bees crowd around. Water very little once established." },
  "Salvia mellifera": { h:[3,6], w:[4,6], bloom:["Sp","Su"], desc:"Dark green, fragrant leaves and tiered whorls of pale flowers. One of the best plants for honeybees and native bees." },
  "Salvia clevelandii": { h:[3,5], w:[3,5], desc:"Intensely fragrant gray-green leaves and blue-violet flower whorls. A garden favorite for scent and hummingbirds." },
  "Salvia leucophylla": { h:[2,5], w:[3,10], bloom:["Sp","Su"], desc:"Soft gray leaves and pinkish-lavender flower whorls. Spreads wide and handles heat well." },
  "Salvia spathacea": { water:2, sun:["part","shade"], soil:"Adaptable", h:[1,3], w:[2,4], bloom:["W","Sp"], desc:"A low, spreading sage with magenta flower spikes, made for dry shade under trees. Hummingbirds visit often." },
  "Eriogonum fasciculatum": { h:[2,4], w:[3,5], genusLevel:false },
  "Eriogonum crocatum": { water:1, sun:["full"], soil:"Clay-tolerant", bloom:["Sp","Su"], wild:["pollinators"], h:[1,3], w:[2,3], ie:false, genusLevel:false,
    desc:"A low, mounding evergreen with silvery woolly leaves and bright sulfur-yellow flower clusters. Easy and low water once established." },
  "Atriplex canescens": { genusLevel:false },
  /* Added 2026-10-25c (see docs/factcheck-2026-10-25c.md). Feed row: Catalog id "giganteum" = Eriogonum giganteum, St. Catherine's lace. */
  "Eriogonum giganteum": { water:[1,2], sun:["full"], soil:"Fast-draining", bloom:["Sp","Su","F"], wild:["pollinators","birds"], h:[3,8], w:[4,10], ie:true, genusLevel:false,   // Eric 2026-10-25: 3–8 ft tall, Low–moderate water
    desc:"The largest buckwheat: a rounded shrub with woolly gray-white leaves and broad, lacy cream flower heads that age to rust. Give it room and good drainage; cut back after bloom." },
  "Bouteloua gracilis": { water:[1,2], wild:["butterflies","containers"], genusLevel:false },   // Eric 2026-10-25: Low–moderate water; butterflies only (skippers)
  "Encelia californica": { sun:["full","part"], soil:"Adaptable", h:[3,4], w:[3,5], genusLevel:false },
  "Encelia farinosa": { h:[1,5], w:[2,4], soil:"Fast-draining", genusLevel:false, desc:"A desert shrub with silver leaves and bright yellow daisies held above the foliage. Loves heat and needs very little water." },
  "Diplacus longiflorus": { sun:["full","part"], soil:"Fast-draining", water:1, bloom:["Sp","Su"], h:[1,3], w:[1,3], genusLevel:false,
    desc:"A compact shrub with large pale-yellow to orange flowers in spring and summer. Give it good drainage and very little summer water." },
  "Diplacus calycinus": { sun:["full","part"], h:[1,3], w:[1,3], genusLevel:false },
  "Penstemon centranthifolius": { h:[2,4], w:[1,2], wild:["hummingbirds","pollinators"], genusLevel:false, desc:"Slender stems of scarlet tubular flowers rise from blue-green leaves. Built for hummingbirds; keep it on the dry side." },
  "Penstemon spectabilis": { h:[3,4], w:[2,3], genusLevel:false, desc:"Tall stems packed with lavender-blue tubular flowers in spring. Needs good drainage and little summer water." },
  /* Added 2026-10-25d (see docs/factcheck-2026-10-25d.md). Waiting on a Catalog row: botanical "Penstemon grinnellii", Grinnell's beardtongue. Mountain native: ie:false (no Heat tough chip). */
  "Penstemon grinnellii": { water:1, sun:["full","part"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","containers"], h:[1,3], w:[1.5,2.5], ie:false, genusLevel:false,
    desc:"A bushy clump of gray-green leaves with stems of wide-throated, pale pink to lavender flowers striped with purple guide lines. Needs sharp drainage, little summer water and some afternoon shade inland." },
  /* Added 2026-10-28 (see docs/factcheck-2026-10-28.md). Feed row: Catalog id "stipa", botanical "Stipa pulchra". */
  "Stipa pulchra": { water:1, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su"], wild:["birds","butterflies"], h:[2,3], w:[1,2], ie:true, genusLevel:false,
    desc:"A fine-leaved bunchgrass with airy, nodding seed heads that open purple-tinged in spring and trail long, twisting awns. Turns golden and rests in summer with little water. The sharp seeds can catch in pet fur, so keep it away from dog runs." },
  "Asclepias fascicularis": { bloom:["Sp","Su","F"], h:[2,3], w:[1,3], genusLevel:false },
  "Asclepias speciosa": { h:[2,4], w:[2,4], genusLevel:false },
  "Asclepias eriocarpa": { h:[1,3], w:[1,2], water:1, genusLevel:false }
};
/* Life form + short tagline (max ~8 words) shown on the card; desc is kept as data but not shown. */
var IENN_FORM = { Salvia:["Shrub","Fragrant bee magnet"], Eriogonum:["Shrub","Tough, long-blooming bee favorite"], Hesperoyucca:["Succulent","One spectacular bloom spike"], Baileya:["Wildflower","Silver leaves, sunny daisies"],
  Calystegia:["Vine","Big white trumpets, fast climber"], Encelia:["Shrub","Fast, cheerful yellow daisies"], Eschscholzia:["Wildflower","Golden state flower"], Muhlenbergia:["Grass","Fountain of fine flower spikes"],
  Romneya:["Perennial","Giant fried-egg flowers"], Asclepias:["Perennial","Monarch caterpillar host"], Diplacus:["Shrub","Hummingbird spring show"], Penstemon:["Perennial","Hummingbird flower spikes"],
  Rhus:["Shrub","Glossy evergreen hedge"], Achillea:["Perennial","Lacy, tough lawn alternative"], Datura:["Perennial","Big white evening trumpets; toxic if eaten"], Artemisia:["Shrub","Silver scent of the hills"],
  Trichostema:["Shrub","Woolly purple, wildly fragrant"], Baccharis:["Shrub","Tough evergreen cover"], Epilobium:["Perennial","Fall feast for hummingbirds"], Hesperocyparis:["Tree","Blue evergreen spire"],
  Dendromecon:["Shrub","Golden chaparral poppies"], Heteromeles:["Small tree","Red winter berries for birds"],
  Atriplex:["Shrub",""], Bouteloua:["Grass",""], Acmispon:["Shrub",""], Sphaeralcea:["Perennial",""], Erythranthe:["Perennial",""], Stipa:["Grass",""] };
var IENN_FORM_SPECIES = { "Diplacus longiflorus":["Shrub",null], "Salvia apiana":[null,"Silvery leaves, tall bee-covered flower spikes"], "Salvia spathacea":["Perennial","Shade-loving hummingbird sage"], "Salvia mellifera":[null,"Honeybee favorite"],
  "Encelia farinosa":[null,"Silver desert sunshine"], "Eriogonum fasciculatum":[null,"Tough, long-blooming bee favorite"], "Baccharis pilularis":["Shrub","Tough evergreen groundcover"] };
/* Old feed botanical -> species key (an older cached feed may still say aurantiacus for Southern bush monkeyflower, formerly "Sticky monkeyflower").
   Synonyms in another genus work too (the alias is resolved before the genus lookup): Nassella pulchra (USDA, older sources) = Stipa pulchra (Jepson). */
var IENN_BASICS_ALIAS = { "Diplacus aurantiacus": "Diplacus longiflorus", "Nassella pulchra": "Stipa pulchra" };
/* Look up basics for a botanical name, e.g. "Salvia apiana". Returns null if the genus is unknown. */
function iennBasics(botanical) {
  var b = String(botanical || "").trim(), key = b.split(/\s+/).slice(0, 2).join(" "); key = IENN_BASICS_ALIAS[key] || key;
  var g = key.split(" ")[0], base = IENN_BASICS[g]; if (!base) return null; var sp = IENN_BASICS_SPECIES[key] || {}, out = {}, k;
  for (k in base) out[k] = base[k]; for (k in sp) out[k] = sp[k];
  if (IENN_BASICS_SPECIES[key] && sp.genusLevel == null && sp.desc) out.genusLevel = false;
  var f = IENN_FORM[g] || [], fs = IENN_FORM_SPECIES[key] || []; out.form = fs[0] || f[0] || ""; out.tag = fs[1] || f[1] || "";
  return out;
}
/* Display-name overrides: feed name (matching/orders unchanged) -> name shown on the site. */
var IENN_DISPLAY_NAMES = { "Sacred datura": "Datura", "Sticky monkeyflower": "Southern bush monkeyflower", "California brittlebush": "Bush sunflower" };   // keys match case-insensitively
function iennDisplayName(n) { if (IENN_DISPLAY_NAMES[n]) return IENN_DISPLAY_NAMES[n]; var k = String(n || "").toLowerCase().trim();
  for (var x in IENN_DISPLAY_NAMES) if (x.toLowerCase() === k) return IENN_DISPLAY_NAMES[x]; return n; }
/* Botanical-name overrides (exact species, case-insensitive): feed botanical -> name shown on the site and used for basics.
   The live feed now says Diplacus longiflorus (fixed in the sheet 2026-10-24); this only covers an older feed cached in a visitor's browser. */
var IENN_DISPLAY_BOTANICAL = { "diplacus aurantiacus": "Diplacus longiflorus" };
function iennDisplayBotanical(b) { var k = String(b || "").toLowerCase().replace(/\s+/g, " ").trim(); return IENN_DISPLAY_BOTANICAL[k] || b; }
/* Plants hidden from the shop (index + order pages). Case-insensitive match on the feed name or botanical name; add more as needed. */
var IENN_HIDDEN_PLANTS = ["California encelia", "Coyote brush", "Bush poppy", "Arizona cypress, Blue Pyramid", "Arizona cypress", "Blue Pyramid Cypress",
  "Cleveland sage", "Purple sage", "Hummingbird sage", "Other",
  "Buffalo grass", "Buffalograss"];   // Buffalo grass: not California native, excluded by Eric 2026-10-25   // "Other" is a catch-all feed row with no botanical name
// Botanical matches (prefix: cultivars like "Hesperocyparis arizonica 'Blue Pyramid'" also match). Never add Encelia californica: Bush sunflower (feed may still say "California brittlebush") shares it and must stay visible.
var IENN_HIDDEN_BOTANICAL = ["Baccharis pilularis", "Dendromecon rigida", "Hesperocyparis arizonica", "Cupressus arizonica",
  "Salvia clevelandii", "Salvia leucophylla", "Salvia spathacea",
  "Bouteloua dactyloides", "Buchloe dactyloides"];   // exact species only: never "Salvia" alone (Black and White sage stay visible)
function iennHidden(p) { function c(x) { return String(x || "").toLowerCase().replace(/\s+/g, " ").trim(); }
  var full = c(p.feedName || p.fullName), names = [c(p.name), full, full.replace(/\s*\(.*$/, "")], b = c(p.botanical || (/\(([^)]*)\)/.exec(full) || [])[1]);
  if (IENN_HIDDEN_PLANTS.some(function (h) { return names.indexOf(c(h)) >= 0; })) return true;
  return !!b && IENN_HIDDEN_BOTANICAL.some(function (h) { h = c(h); return b === h || b.indexOf(h + " ") === 0; }); }
