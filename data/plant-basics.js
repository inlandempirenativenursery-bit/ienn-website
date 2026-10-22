/* Plant basics for the card's swipe panel. Original wording; general horticultural knowledge, kept conservative.
   Keyed by genus (from the botanical name) with optional per-species overrides in IENN_BASICS_SPECIES (merged over the genus).
   water: 1 = about monthly, 2 = twice a month, 3 = weekly (once established, after year one)
   sun: "full" | "part" | "shade"   soil: "Fast-draining" | "Clay-tolerant" | "Adaptable"
   bloom: any of "W","Sp","Su","F"   wild: "pollinators","hummingbirds","birds","fragrant","containers"
   h/w: mature size in feet [min,max]   ie: thrives in Inland Empire heat   genusLevel: true = genus-level info, not species-specific */
var IENN_BASICS = {
  Salvia: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","birds","fragrant"], h:[3,5], w:[3,5], ie:true, genusLevel:true,
    desc:"California sages are aromatic, drought-hardy shrubs that bees love. Give them sun and good drainage, then mostly leave them alone in summer." },
  Eriogonum: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su","F"], wild:["pollinators","birds"], h:[2,4], w:[3,5], ie:true, genusLevel:true,
    desc:"Buckwheats are tough, low-water shrubs with long-lasting flower clusters that fade to rust in fall. A top plant for native bees and butterflies." },
  Hesperoyucca: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp"], wild:["pollinators"], h:[2,3], w:[2,4], ie:true,
    desc:"A spiky rosette of blue-gray leaves that sends up one tall stalk of creamy flowers, then the plant finishes. Plant it away from paths." },
  Baileya: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su","F"], wild:["pollinators","containers"], h:[1,1.5], w:[1,1.5], ie:true,
    desc:"Silvery leaves and bright yellow daisies for months. Short-lived but often reseeds; give it heat, sun and sharp drainage." },
  Calystegia: { water:2, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su"], wild:["pollinators"], h:[3,10], w:[3,6], ie:true, genusLevel:true,
    desc:"A vigorous native vine with large white to pale-pink trumpet flowers. Let it climb a fence or ramble over a slope." },
  Encelia: { water:1, sun:["full"], soil:"Fast-draining", bloom:["W","Sp"], wild:["pollinators","birds"], h:[3,4], w:[3,5], ie:true, genusLevel:true,
    desc:"A fast, rounded shrub covered in cheerful yellow daisies from late winter into spring. Very forgiving and quick to fill space." },
  Eschscholzia: { water:1, sun:["full"], soil:"Fast-draining", bloom:["W","Sp"], wild:["pollinators","containers"], h:[1,1.5], w:[1,1.5], ie:true,
    desc:"The state flower: silky orange cups that open in sun and close at night. Often reseeds for next year's show." },
  Muhlenbergia: { water:2, sun:["full","part"], soil:"Adaptable", bloom:["Su","F"], wild:["birds"], h:[3,4], w:[3,4], ie:true,
    desc:"A big, fountain-shaped bunchgrass with tall slender flower spikes. Great for structure, slopes and erosion control." },
  Romneya: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators"], h:[5,8], w:[5,10], ie:true,
    desc:"Huge white flowers like fried eggs on tall blue-gray stems. It spreads by roots once happy, so give it room and little summer water." },
  Asclepias: { water:2, sun:["full"], soil:"Adaptable", bloom:["Su"], wild:["pollinators"], h:[2,3], w:[1,3], ie:true, genusLevel:true,
    desc:"Native milkweed is the host plant monarch caterpillars need. It dies back in winter and returns in spring; leave the caterpillars be." },
  Diplacus: { water:1, sun:["full","part"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","containers"], h:[2,4], w:[2,3], ie:true, genusLevel:true,
    desc:"Monkeyflowers bloom heavily in spring with tubular flowers hummingbirds visit. Afternoon shade and little summer water keep them happy." },
  Penstemon: { water:1, sun:["full"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","containers"], h:[2,4], w:[1,3], ie:true, genusLevel:true,
    desc:"Upright spikes of tubular flowers that hummingbirds find fast. Needs good drainage; avoid overwatering." },
  Rhus: { water:1, sun:["full","part"], soil:"Adaptable", bloom:["W","Sp"], wild:["pollinators","birds"], h:[6,10], w:[6,10], ie:true,
    desc:"A sturdy evergreen shrub with glossy leaves and small pink-white flowers. Useful as a hedge or screen once established." },
  Achillea: { water:2, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su"], wild:["pollinators","fragrant","containers"], h:[1,3], w:[1,3], ie:true,
    desc:"Feathery, aromatic leaves with flat clusters of small flowers. Spreads into a soft patch and can even be mowed as a lawn alternative." },
  Datura: { water:1, sun:["full"], soil:"Adaptable", bloom:["Su","F"], wild:["pollinators","fragrant"], h:[2,4], w:[3,6], ie:true,
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
  Dendromecon: { water:1, sun:["full"], soil:"Fast-draining", bloom:["W","Sp"], wild:["pollinators"], h:[4,8], w:[4,8], ie:true,
    desc:"A chaparral shrub with bright yellow poppy flowers. Needs excellent drainage and dislikes summer water." },
  Heteromeles: { water:1, sun:["full","part"], soil:"Adaptable", bloom:["Su"], wild:["pollinators","birds"], h:[8,15], w:[6,12], ie:true,
    desc:"An evergreen shrub with white summer flowers and bright red winter berries that birds love. A classic native hedge or small tree." }
};
var IENN_BASICS_SPECIES = {
  "Salvia apiana": { h:[3,5], w:[3,5], bloom:["Sp"], desc:"Striking silver-white leaves with a strong fragrance and tall flower wands bees crowd around. Water very little once established." },
  "Salvia mellifera": { h:[3,6], w:[4,6], bloom:["Sp"], desc:"Dark green, fragrant leaves and tiered whorls of pale flowers. One of the best plants for honeybees and native bees." },
  "Salvia clevelandii": { h:[3,5], w:[3,5], desc:"Intensely fragrant gray-green leaves and blue-violet flower whorls. A garden favorite for scent and hummingbirds." },
  "Salvia leucophylla": { h:[3,5], w:[4,6], bloom:["Sp"], desc:"Soft gray leaves and pinkish-lavender flower whorls. Spreads wide and handles heat well." },
  "Salvia spathacea": { water:2, sun:["part","shade"], soil:"Adaptable", h:[1,3], w:[2,4], bloom:["W","Sp"], desc:"A low, spreading sage with magenta flower spikes, made for dry shade under trees. Hummingbirds visit often." },
  "Eriogonum fasciculatum": { h:[2,4], w:[3,5], genusLevel:false },
  "Encelia californica": { sun:["full","part"], soil:"Adaptable", h:[3,4], w:[3,5], genusLevel:false },
  "Encelia farinosa": { h:[2,4], w:[2,4], soil:"Fast-draining", genusLevel:false, desc:"A desert shrub with silver leaves and bright yellow daisies held above the foliage. Loves heat and needs very little water." },
  "Diplacus calycinus": { sun:["full","part"], h:[1,3], w:[1,3], genusLevel:false },
  "Penstemon centranthifolius": { h:[2,4], w:[1,2], wild:["hummingbirds","pollinators"], genusLevel:false, desc:"Slender stems of scarlet tubular flowers rise from blue-green leaves. Built for hummingbirds; keep it on the dry side." },
  "Penstemon spectabilis": { h:[3,4], w:[2,3], genusLevel:false, desc:"Tall stems packed with lavender-blue tubular flowers in spring. Needs good drainage and little summer water." },
  "Asclepias fascicularis": { h:[2,3], w:[1,3], genusLevel:false },
  "Asclepias speciosa": { h:[2,4], w:[2,4], genusLevel:false },
  "Asclepias eriocarpa": { h:[1,3], w:[1,2], water:1, genusLevel:false }
};
/* Life form + short tagline (max ~8 words) shown on the card; desc is kept as data but not shown. */
var IENN_FORM = { Salvia:["Shrub","Fragrant bee magnet"], Eriogonum:["Shrub","Tough, long-blooming bee favorite"], Hesperoyucca:["Succulent","One spectacular bloom spike"], Baileya:["Wildflower","Silver leaves, sunny daisies"],
  Calystegia:["Vine","Big white trumpets, fast climber"], Encelia:["Shrub","Fast, cheerful yellow daisies"], Eschscholzia:["Wildflower","Golden state flower"], Muhlenbergia:["Grass","Fountain of fine flower spikes"],
  Romneya:["Perennial","Giant fried-egg flowers"], Asclepias:["Perennial","Monarch caterpillar host"], Diplacus:["Sub-shrub","Hummingbird spring show"], Penstemon:["Perennial","Hummingbird flower spikes"],
  Rhus:["Shrub","Glossy evergreen hedge"], Achillea:["Perennial","Lacy, tough lawn alternative"], Datura:["Perennial","Big white evening trumpets; toxic if eaten"], Artemisia:["Shrub","Silver scent of the hills"],
  Trichostema:["Sub-shrub","Woolly purple, wildly fragrant"], Baccharis:["Shrub","Tough evergreen cover"], Epilobium:["Perennial","Fall feast for hummingbirds"], Hesperocyparis:["Tree","Blue evergreen spire"],
  Dendromecon:["Shrub","Golden chaparral poppies"], Heteromeles:["Small tree","Red winter berries for birds"] };
var IENN_FORM_SPECIES = { "Salvia apiana":[null,"Silvery leaves, tall bee-covered flower spikes"], "Salvia spathacea":["Perennial","Shade-loving hummingbird sage"], "Salvia mellifera":[null,"Honeybee favorite"],
  "Encelia farinosa":[null,"Silver desert sunshine"], "Eriogonum fasciculatum":[null,"Tough, long-blooming bee favorite"], "Baccharis pilularis":["Shrub","Tough evergreen groundcover"] };
/* Look up basics for a botanical name, e.g. "Salvia apiana". Returns null if the genus is unknown. */
function iennBasics(botanical) {
  var b = String(botanical || "").trim(), g = b.split(/\s+/)[0], base = IENN_BASICS[g]; if (!base) return null;
  var key = b.split(/\s+/).slice(0, 2).join(" "), sp = IENN_BASICS_SPECIES[key] || {}, out = {}, k;
  for (k in base) out[k] = base[k]; for (k in sp) out[k] = sp[k];
  if (IENN_BASICS_SPECIES[key] && sp.genusLevel == null && sp.desc) out.genusLevel = false;
  var f = IENN_FORM[g] || [], fs = IENN_FORM_SPECIES[key] || []; out.form = fs[0] || f[0] || ""; out.tag = fs[1] || f[1] || "";
  return out;
}
