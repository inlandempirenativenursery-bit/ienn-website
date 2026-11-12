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
    desc:"Large white trumpet flowers open in the evening for night-flying moths. All parts of the plant are toxic." },
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
  /* Wild-type Common yarrow — preview care copy from Yuki's Nov 10 draft (Eric's answers via Kobe). Yarrow only until Eric OK's more. */
  "Achillea millefolium": {
    genusLevel: false,
    careCommon: "Common yarrow",
    careBotanical: "Achillea millefolium",
    careIntro: "is a perennial with feathery leaves and flat clusters of white flowers, usually growing 1–3 feet tall.",
    careBullets: [
      "Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.",
      "It tolerates many soils; avoid constantly wet ground.",
      "Water during establishment, then adjust for drainage, heat and site conditions. Established plants have low water needs.",
      "Blooms from spring into fall and attracts pollinators.",
      "Spreads by rhizomes (underground stems) and can reseed, so give it room."
    ],
    careSourceName: "Calscape (CNPS)",
    careSourceUrl: "https://calscape.org/Achillea-millefolium-(Common-Yarrow)",
    careSources: [
      { name: "Calscape (CNPS)", url: "https://calscape.org/Achillea-millefolium-(Common-Yarrow)" },
      { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-achillea-millefolium" },
      { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/14--achillea-millefolium-californica" }
    ]
  },

  /* White sage — preview care copy from Yuki's Nov 10 final draft (Eric-approved copy via Kobe). Existing h/w/bloom/desc unchanged. */
  "Salvia apiana": { h:[3,5], w:[3,8], bloom:["Sp","Su"], desc:"Striking silver-white leaves with a strong fragrance and tall flower wands bees crowd around. Water very little once established.",
    genusLevel: false,
    careCommon: "White sage",
    careBotanical: "Salvia apiana",
    careIntro: "is a shrub with fragrant silver-white leaves and tall wands of white flowers, sometimes with a hint of lavender, in spring and summer, usually growing 3–5 feet tall and 3–8 feet wide.",
    careBullets: [
      "Give it full sun.",
      "It needs well-drained soil and tolerates many soil types, including heavier soil, as long as it does not stay wet.",
      "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
      "Give it room to reach 3–8 feet wide.",
      "After the flowers finish in late summer, spent stalks can be cut off. Sprawling branches can be trimmed at any time."
    ],
    careSourceName: "Calscape (CNPS)",
    careSourceUrl: "https://calscape.org/Salvia-apiana-(White-Sage)",
    careSources: [
      { name: "Calscape (CNPS)", url: "https://calscape.org/Salvia-apiana-(White-Sage)" },
      { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-salvia-apiana" },
      { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/604--salvia-apiana" }
    ]
  },
  "Salvia mellifera": { h:[3,6], w:[4,6], bloom:["Sp","Su"], desc:"Dark green, fragrant leaves and tiered whorls of pale flowers. One of the best plants for honeybees and native bees." },
  "Salvia clevelandii": { h:[3,5], w:[3,5], desc:"Intensely fragrant gray-green leaves and blue-violet flower whorls. A garden favorite for scent and hummingbirds." },
  "Salvia leucophylla": { h:[2,5], w:[3,10], bloom:["Sp","Su"], desc:"Soft gray leaves and pinkish-lavender flower whorls. Spreads wide and handles heat well." },
  "Salvia spathacea": { water:2, sun:["part","shade"], soil:"Adaptable", h:[1,3], w:[2,4], bloom:["W","Sp"], desc:"A low, spreading sage with magenta flower spikes, made for dry shade under trees. Hummingbirds visit often." },
  "Eriogonum fasciculatum": { h:[2,4], w:[3,5], genusLevel:false },
  /* Card soil label to match the batch-8 care page (Eric, Nov 12 11:21 AM PT); species row only.
     Conejo buckwheat "Adaptable" (card: "Any soil"). Eriogonum genus and California buckwheat unchanged. */
  "Eriogonum crocatum": { water:1, sun:["full"], soil:"Adaptable", bloom:["Sp","Su"], wild:["pollinators"], h:[1,3], w:[2,3], ie:false, genusLevel:false,
    desc:"A low, mounding evergreen with silvery woolly leaves and bright sulfur-yellow flower clusters. Easy and low water once established." },
  /* Card labels to match the batch-7 care pages (Eric, Nov 12 10:52 AM PT); species rows only, genus entries unchanged.
     California sagebrush "Adaptable" (card: "Any soil"); Four-winged saltbush height 2–4 ft (width stays 3–7), bloom Summer only. */
  "Artemisia californica": { soil:"Adaptable" },
  "Atriplex canescens": { h:[2,4], bloom:["Su"], genusLevel:false },
  /* Added 2026-10-25c (see docs/factcheck-2026-10-25c.md). Feed row: Catalog id "giganteum" = Eriogonum giganteum, St. Catherine's lace. */
  "Eriogonum giganteum": { water:[1,2], sun:["full"], soil:"Fast-draining", bloom:["Sp","Su","F"], wild:["pollinators","birds"], h:[3,8], w:[4,10], ie:true, genusLevel:false,   // Eric 2026-10-25: 3–8 ft tall, Low–moderate water
    desc:"The largest buckwheat: a rounded shrub with woolly gray-white leaves and broad, lacy cream flower heads that age to rust. Give it room and good drainage; cut back after bloom." },
  "Bouteloua gracilis": { water:[1,2], wild:["butterflies","containers"], genusLevel:false },   // Eric 2026-10-25: Low–moderate water; butterflies only (skippers)
  "Encelia californica": { sun:["full","part"], soil:"Adaptable", h:[3,4], w:[3,5], genusLevel:false },
  /* Card soil labels to match the batch-6 care pages (Eric, Nov 12 9:28 AM PT); species rows only, genus entries unchanged.
     Brittlebush + Matilija poppy "Adaptable" (card: "Any soil"); Apricot mallow "Sandy or clay" (shown as written). */
  "Romneya coulteri": { soil:"Adaptable" },
  "Sphaeralcea ambigua": { soil:"Sandy or clay" },
  "Encelia farinosa": { h:[1,5], w:[2,4], soil:"Adaptable", genusLevel:false, desc:"A desert shrub with silver leaves and bright yellow daisies held above the foliage. Loves heat and needs very little water." },
  "Diplacus longiflorus": { sun:["full","part"], soil:"Fast-draining", water:1, bloom:["Sp","Su"], h:[1,3], w:[1,3], genusLevel:false,
    desc:"A compact shrub with large pale-yellow to orange flowers in spring and summer. Give it good drainage and very little summer water." },
  "Diplacus calycinus": { sun:["full","part"], h:[1,3], w:[1,3], genusLevel:false },
  "Penstemon centranthifolius": { h:[2,4], w:[1,2], soil:"Clay-tolerant", wild:["hummingbirds","pollinators"], genusLevel:false, desc:"Slender stems of scarlet tubular flowers rise from blue-green leaves. Built for hummingbirds; keep it on the dry side." },
  "Penstemon spectabilis": { h:[2,4], w:[3,4], soil:"Clay-tolerant", genusLevel:false, desc:"Tall stems packed with lavender-blue tubular flowers in spring. Needs good drainage and little summer water." },
  /* Sizes set to match the approved care sheets (Eric, Nov 12 8:53 AM PT): Showy penstemon 2–4 × 3–4 ft (above); Woolly blue curls about 4 × 4 ft as a species override (genus Trichostema stays 3–5 × 3–5).
     Card light/soil to match the care pages (Eric, Nov 12 9:00 AM PT): Woolly blue curls sun to part sun; Showy penstemon + Scarlet bugler Clay-tolerant ("Clay OK"). Species rows only. */
  "Trichostema lanatum": { h:[4,4], w:[4,4], sun:["full","part"] },
  /* Added 2026-10-25d (see docs/factcheck-2026-10-25d.md). Waiting on a Catalog row: botanical "Penstemon grinnellii", Grinnell's beardtongue (shown as Southern woodland penstemon since Nov 10). Mountain native: ie:false (no Heat tough chip). */
  "Penstemon grinnellii": { water:1, sun:["full","part"], soil:"Fast-draining", bloom:["Sp","Su"], wild:["pollinators","hummingbirds","containers"], h:[1,3], w:[1.5,2.5], ie:false, genusLevel:false,
    desc:"A bushy clump of gray-green leaves with stems of wide-throated, pale pink to lavender flowers striped with purple guide lines. Needs sharp drainage, little summer water and some afternoon shade inland." },
  /* Added 2026-10-28 (see docs/factcheck-2026-10-28.md). Feed row: Catalog id "stipa", botanical "Stipa pulchra". */
  "Stipa pulchra": { water:1, sun:["full","part"], soil:"Adaptable", bloom:["Sp","Su"], wild:["birds","butterflies"], h:[2,3], w:[1,2], ie:true, genusLevel:false,
    desc:"A fine-leaved bunchgrass with airy, nodding seed heads that open purple-tinged in spring and trail long, twisting awns. Turns golden and rests in summer with little water. The sharp seeds can catch in pet fur, so keep it away from dog runs." },
  "Asclepias fascicularis": { bloom:["Sp","Su","F"], h:[2,3], w:[1,3], genusLevel:false },
  /* Card labels to match the batch-9 care pages (Eric, Nov 12 11:50 AM PT); species rows only.
     Showy milkweed Low water (water:1) and Spring–Summer bloom; Woollypod milkweed sun / part sun and Spring–Summer bloom.
     Asclepias genus and Narrowleaf milkweed unchanged. */
  "Asclepias speciosa": { h:[2,4], w:[2,4], water:1, bloom:["Sp","Su"], genusLevel:false },
  "Asclepias eriocarpa": { h:[1,3], w:[1,2], water:1, sun:["full","part"], bloom:["Sp","Su"], genusLevel:false }
};
/* Approved care sheets added one block per plant below (batch 2, Nov 10). iennCare merges care fields into the species row,
   creating the row if missing; a row created here holds care text only, so card numbers still come from the genus entry.
   Each plant sits in its own slot so a single plant can be dropped without touching the others (tests: tests/care-sheets/). */
function iennCare(key, care) { var row = IENN_BASICS_SPECIES[key] || (IENN_BASICS_SPECIES[key] = {}); for (var k in care) row[k] = care[k]; }

/* care slot: datura */
iennCare("Datura wrightii", {
  careCommon: "Datura",
  careBotanical: "Datura wrightii",
  careIntro: "is a perennial with large white trumpet flowers that open in the evening, usually growing 1–5 feet tall and 3–6 feet wide. Caution: all parts of the plant are toxic.",
  careBullets: [
    "Give it full sun.",
    "It needs well-drained soil and tolerates many soil types, as long as it does not stay wet.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 3–6 feet wide.",
    "When it starts to die back, cut it down to the ground. It comes back better."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/Datura-wrightii-(Sacred-Datura)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/Datura-wrightii-(Sacred-Datura)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-datura-wrightii-local" },
    { name: "Jepson eFlora", url: "https://ucjeps.berkeley.edu/eflora/eflora_display.php?tid=22389" }
  ]
});

/* care slot: southern-bush-monkeyflower */
iennCare("Diplacus longiflorus", {
  careCommon: "Southern bush monkeyflower",
  careBotanical: "Diplacus longiflorus",
  careIntro: "is a compact shrub with large pale-yellow to orange flowers in spring and summer, usually growing 1–3 feet tall and 1–3 feet wide.",
  careBullets: [
    "Give it morning sun and afternoon shade. An east-facing spot works well. It handles more sun in cool months, but needs afternoon shade in summer heat.",
    "It needs well-drained soil.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 1–3 feet wide.",
    "It may go dry and drop leaves in summer; that is normal when it gets little water."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/Diplacus-longiflorus-(Southern-Bush-Monkeyflower)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/Diplacus-longiflorus-(Southern-Bush-Monkeyflower)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-diplacus-longiflorus-mim" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/244--diplacus-longiflorus" }
  ]
});

/* care slot: sugar-bush */
iennCare("Rhus ovata", {
  careCommon: "Sugarbush",
  careBotanical: "Rhus ovata",
  careIntro: "is an evergreen shrub with glossy leaves and small pink-white flowers in winter and spring, usually growing 7–15 feet tall and 7–15 feet wide.",
  careBullets: [
    "Give it full sun to partial shade.",
    "It tolerates many soils, as long as it does not stay wet.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 7–15 feet wide.",
    "It needs little pruning to stay tidy, and it can be used as a hedge or screen."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/Rhus-ovata-(Sugar-Bush)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/Rhus-ovata-(Sugar-Bush)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-rhus-ovata" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/572--rhus-ovata" }
  ]
});

/* care slot: narrow-leaf-milkweed */
iennCare("Asclepias fascicularis", {
  careCommon: "Narrowleaf milkweed",
  careBotanical: "Asclepias fascicularis",
  careIntro: "is a perennial with clusters of lavender to pinkish-white flowers in spring, summer and fall, usually growing 2–3 feet tall and 1–3 feet wide. It is a host plant for monarch caterpillars.",
  careBullets: [
    "Give it full sun.",
    "It tolerates many soils.",
    "Water during establishment, then water occasionally once established.",
    "Give it room to reach 1–3 feet wide. It can spread and reseed.",
    "It dies back in winter and returns in spring. Leave the dry stems and any caterpillars until new growth appears."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/434/Asclepias-fascicularis-(Narrow-Leaf-Milkweed)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/434/Asclepias-fascicularis-(Narrow-Leaf-Milkweed)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-asclepias-fascicularis" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/100--asclepias-fascicularis" }
  ]
});

/* care slot: black-sage */
iennCare("Salvia mellifera", {
  careCommon: "Black sage",
  careBotanical: "Salvia mellifera",
  careIntro: "is a shrub with dark green, fragrant leaves and tiered whorls of pale flowers in spring and summer, usually growing 3–6 feet tall and 4–6 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It needs well-drained soil and tolerates many soil types, as long as it does not stay wet.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 4–6 feet wide.",
    "The leaves may curl in summer drought; that is normal."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/Salvia-mellifera-(Black-Sage)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/Salvia-mellifera-(Black-Sage)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-salvia-mellifera" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/612--salvia-mellifera" }
  ]
});

/* care slot: bush-sunflower */
iennCare("Encelia californica", {
  careCommon: "Bush sunflower",
  careBotanical: "Encelia californica",
  careIntro: "is a fast-growing, rounded shrub with bright yellow daisy flowers in winter and spring, usually growing 3–4 feet tall and 3–5 feet wide.",
  careBullets: [
    "Give it full sun to partial shade.",
    "It tolerates many soils.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 3–5 feet wide.",
    "It may go dry in summer; that is normal. It can be cut back after bloom to keep it compact."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/Encelia-californica-(Bush-Sunflower)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/Encelia-californica-(Bush-Sunflower)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-encelia-californica" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/260--encelia-californica" }
  ]
});

/* care slot: scarlet-monkeyflower */
iennCare("Erythranthe cardinalis", {
  careCommon: "Scarlet monkeyflower",
  careBotanical: "Erythranthe cardinalis",
  careIntro: "is a perennial with bright red-orange tubular flowers over soft, toothed leaves in spring, summer and fall, usually growing 2–3 feet tall and 3 feet wide.",
  careBullets: [
    "Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.",
    "It tolerates many soils, including moist or wet ground.",
    "Water regularly, especially in summer heat.",
    "Give it room to reach 3 feet wide. It can spread.",
    "Spent flowers can be cut off to encourage more blooms and keep the plant from getting floppy."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/2518/Erythranthe-cardinalis-(Scarlet-Monkeyflower)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/2518/Erythranthe-cardinalis-(Scarlet-Monkeyflower)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-erythranthe-mimulus-card" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/433--mimulus-cardinalis" }
  ]
});

/* care slot: purple-needlegrass */
iennCare("Stipa pulchra", {
  careCommon: "Purple needlegrass",
  careBotanical: "Stipa pulchra",
  careIntro: "is a fine-leaved bunchgrass with airy, nodding seed heads that open purple-tinged in spring and summer, usually growing 2–3 feet tall and 1–2 feet wide. It is California’s state grass.",
  careBullets: [
    "Give it full sun to partial shade.",
    "It tolerates many soils.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 1–2 feet wide.",
    "It turns golden and rests in summer; that is normal. It can be cut back when it turns brown at the end of summer."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/Stipa-pulchra-(Purple-Needlegrass)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/Stipa-pulchra-(Purple-Needlegrass)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-stipa-nassella-pulchra" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/663--stipa-pulchra" }
  ]
});

/* care slot: blue-grama */
iennCare("Bouteloua gracilis", {
  careCommon: "Blue grama",
  careBotanical: "Bouteloua gracilis",
  careIntro: "is a fine-textured bunchgrass with eyelash-shaped seed heads in summer and fall, usually growing 6 inches to 2 feet tall and 2 feet wide. In California, it grows wild mainly in the dry mountains of San Bernardino County and the eastern Mojave.",
  careBullets: [
    "Give it full sun to partial shade.",
    "It needs well-drained soil and tolerates many soil types, as long as it does not stay wet.",
    "Water during establishment, then very little to occasional water once established.",
    "Give it room to reach 2 feet wide.",
    "It is winter-dormant and goes tan; that is normal. It can be cut back in winter when dormant."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/Bouteloua-gracilis-(Blue-Grama)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/Bouteloua-gracilis-(Blue-Grama)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-bouteloua-gracilis" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/1064--bouteloua-gracilis" }
  ]
});

/* care slot: st-catherines-lace */
iennCare("Eriogonum giganteum", {
  careCommon: "St. Catherine's lace",
  careBotanical: "Eriogonum giganteum",
  careIntro: "is a rounded shrub with woolly gray-white leaves and broad, lacy cream flower heads that age to rust, in spring, summer and fall, usually growing 3–8 feet tall and 4–10 feet wide. It grows wild only on the southern Channel Islands.",
  careBullets: [
    "Give it full sun.",
    "It needs well-drained soil and can tolerate heavier soil, as long as it does not stay wet.",
    "Water during establishment, then very little to occasional water once established.",
    "Give it room to reach 4–10 feet wide.",
    "After bloom, the old flower heads can be cut back or left on."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/1506/Eriogonum-giganteum-(St.-Catherine's-Lace)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/1506/Eriogonum-giganteum-(St.-Catherine's-Lace)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-eriogonum-gigant-4817713" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/287--eriogonum-giganteum" }
  ]
});

/* care slot: deergrass */
iennCare("Muhlenbergia rigens", {
  careCommon: "Deergrass",
  careBotanical: "Muhlenbergia rigens",
  careIntro: "is a fountain-shaped bunchgrass with tall slender flower spikes in summer and fall, usually growing 3–4 feet tall and 3–4 feet wide.",
  careBullets: [
    "Give it full sun to partial shade.",
    "It tolerates many soils.",
    "Water during establishment, then water occasionally once established.",
    "Give it room to reach 3–4 feet wide.",
    "It can be cut back in fall if it becomes unruly."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/2596/Muhlenbergia-rigens-(Deergrass)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/2596/Muhlenbergia-rigens-(Deergrass)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-muhlenbergia-rigens" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/446--muhlenbergia-rigens" }
  ]
});
/* care slot: california-buckwheat */
iennCare("Eriogonum fasciculatum", {
  careCommon: "California buckwheat",
  careBotanical: "Eriogonum fasciculatum",
  careIntro: "is a tough, rounded shrub with clusters of pink to white flowers that fade to rust, in spring, summer and fall, usually growing 2–4 feet tall and 3–5 feet wide.",
  careBullets: [
    "Give it full sun to part sun.",
    "It needs well-drained soil and tolerates many soil types, as long as it does not stay wet.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 3–5 feet wide.",
    "It can handle a hard cut-back, and the rust-colored flower heads can be left on into winter."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/1502/Eriogonum-fasciculatum-(California-Buckwheat)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/1502/Eriogonum-fasciculatum-(California-Buckwheat)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/eriogonum-fasciculatum" }
  ]
});
/* care slot: chaparral-yucca */
iennCare("Hesperoyucca whipplei", {
  careCommon: "Chaparral yucca",
  careBotanical: "Hesperoyucca whipplei",
  careIntro: "is a spiky rosette of blue-gray leaves that sends up one tall stalk of creamy flowers in spring and summer. The rosette is usually 2–4 feet wide; the flower stalk can reach 12 feet. It often takes 5–6 years to flower.",
  careBullets: [
    "Give it full sun.",
    "It needs well-drained soil.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 2–4 feet wide, and plant it away from paths, because the leaf tips are sharp.",
    "After it flowers, the blooming rosette dies and can be removed. New plants may come up from seed or from offsets at the base."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/1864/Hesperoyucca-whipplei-(Chaparral-Yucca)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/1864/Hesperoyucca-whipplei-(Chaparral-Yucca)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-hesperoyucca-whipplei" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/880--yucca-whipplei" }
  ]
});
/* care slot: southern-woodland-penstemon */
iennCare("Penstemon grinnellii", {
  careCommon: "Southern woodland penstemon",
  careBotanical: "Penstemon grinnellii",
  careIntro: "is a bushy clump of gray-green leaves with stems of wide-throated, pale pink to lavender flowers striped with purple guide lines, in spring and summer, usually growing 1–3 feet tall and 1.5–2.5 feet wide.",
  careBullets: [
    "Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.",
    "It needs well-drained soil and tolerates many soil types, as long as it does not stay wet.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 1.5–2.5 feet wide.",
    "In California, it grows wild mainly in the mountains."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/2767/Penstemon-grinnellii-(Grinnell's-Beardtongue)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/2767/Penstemon-grinnellii-(Grinnell's-Beardtongue)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-penstemon-grinnellii" },
    { name: "Las Pilitas Nursery", url: "https://www.laspilitas.com/nature-of-california/plants/468--penstemon-grinnellii" }
  ]
});
/* care slot: california-poppy */
iennCare("Eschscholzia californica", {
  careCommon: "California poppy",
  careBotanical: "Eschscholzia californica",
  careIntro: "is an annual, and in milder areas a short-lived perennial, with feathery blue-green leaves and silky orange to yellow flowers in spring and summer, usually growing 1–1.5 feet tall and 1–1.5 feet wide. It often reseeds. It is California's state flower.",
  careBullets: [
    "Give it full sun.",
    "It prefers well-drained soil and tolerates many soil types, including poorer or heavier soil.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 1–1.5 feet wide.",
    "Sow seed in fall, as the rains begin."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/1602/Eschscholzia-californica-(California-Poppy)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/1602/Eschscholzia-californica-(California-Poppy)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-eschscholzia-californica" }
  ]
});
/* care slot: desert-marigold */
iennCare("Baileya multiradiata", {
  careCommon: "Desert marigold",
  careBotanical: "Baileya multiradiata",
  careIntro: "is a short-lived perennial, sometimes grown as an annual, with silvery leaves and bright yellow daisy flowers in spring, summer and fall, usually growing 1–1.5 feet tall and 1–1.5 feet wide. It often reseeds.",
  careBullets: [
    "Give it full sun.",
    "It needs well-drained, even sandy or rocky, soil.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 1–1.5 feet wide.",
    "Skip organic mulch; a rocky surface suits it better."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/511/Baileya-multiradiata-(Wild-Marigold)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/511/Baileya-multiradiata-(Wild-Marigold)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-baileya-multiradiata" }
  ]
});
/* care slot: california-fuchsia */
iennCare("Epilobium canum", {
  careCommon: "California fuchsia",
  careBotanical: "Epilobium canum",
  careIntro: "is a perennial with bright red-orange tubular flowers in summer and fall, usually growing 1–2 feet tall and 2–3 feet wide.",
  careBullets: [
    "Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.",
    "It tolerates many soils.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 2–3 feet wide. It can spread.",
    "After the flowers finish in late fall, it can be cut to the ground. It dies back in winter and returns in spring."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/1413/Epilobium-canum-(California-Fuchsia)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/1413/Epilobium-canum-(California-Fuchsia)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-epilobium-zausch-4817644" }
  ]
});
/* care slot: showy-penstemon */
iennCare("Penstemon spectabilis", {
  careCommon: "Showy penstemon",
  careBotanical: "Penstemon spectabilis",
  careIntro: "is a perennial with tall stems packed with wide-mouthed, lavender-blue to purple tubular flowers in spring and summer, usually growing 2–4 feet tall and 3–4 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It needs well-drained soil and tolerates many soil types, including clay.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 3–4 feet wide.",
    "It is fairly short-lived, but it often reseeds."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/2805/Penstemon-spectabilis-(Showy-Penstemon)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/2805/Penstemon-spectabilis-(Showy-Penstemon)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-penstemon-spectabilis" }
  ]
});
/* care slot: scarlet-bugler */
iennCare("Penstemon centranthifolius", {
  careCommon: "Scarlet bugler",
  careBotanical: "Penstemon centranthifolius",
  careIntro: "is a perennial with slender stems of scarlet tubular flowers and blue-green leaves, in spring and summer, usually growing 2–4 feet tall and 1–2 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It needs well-drained soil and tolerates many soil types, including clay.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 1–2 feet wide.",
    "It does well in rock gardens and on slopes."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/2748/Penstemon-centranthifolius-(Scarlet-Bugler)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/2748/Penstemon-centranthifolius-(Scarlet-Bugler)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-penstemon-centranthifoli" }
  ]
});
/* care slot: woolly-blue-curls */
iennCare("Trichostema lanatum", {
  careCommon: "Woolly blue curls",
  careBotanical: "Trichostema lanatum",
  careIntro: "is a short-lived shrub with fragrant narrow leaves and woolly purple-blue flower spikes in spring and summer, usually growing about 4 feet tall and 4 feet wide.",
  careBullets: [
    "Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.",
    "It needs well-drained, even sandy or rocky, soil.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach about 4 feet wide.",
    "Skip organic mulch; a rocky surface suits it better."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/3704/Trichostema-lanatum-(Woolly-Bluecurls)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/3704/Trichostema-lanatum-(Woolly-Bluecurls)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-trichostema-lanatum" }
  ]
});
/* care slot: matilija-poppy */
iennCare("Romneya coulteri", {
  careCommon: "Matilija poppy",
  careBotanical: "Romneya coulteri",
  careIntro: "is a perennial with huge white flowers like fried eggs, with yellow centers, on tall blue-gray stems, in spring and summer, usually growing 5–8 feet tall and 5–10 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 5–10 feet wide. It can spread.",
    "In late summer or fall, it can be cut back to about 6 inches."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/3253/Romneya-coulteri-(Coulter's-Matilija-Poppy)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/3253/Romneya-coulteri-(Coulter's-Matilija-Poppy)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-romneya-coulteri" }
  ]
});
/* care slot: apricot-mallow */
iennCare("Sphaeralcea ambigua", {
  careCommon: "Apricot mallow",
  careBotanical: "Sphaeralcea ambigua",
  careIntro: "is a perennial with fuzzy gray-green leaves and bowl-shaped apricot-orange flowers in spring and summer, usually growing 3–5 feet tall and 2–4 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It prefers well-drained soil and tolerates many soil types, including sandy or clay soils.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 2–4 feet wide.",
    "After it finishes blooming, it can be cut back to keep it compact."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/3575/Sphaeralcea-ambigua-(Desert-Globemallow)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/3575/Sphaeralcea-ambigua-(Desert-Globemallow)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-sphaeralcea-ambigua" }
  ]
});
/* care slot: brittlebush */
iennCare("Encelia farinosa", {
  careCommon: "Brittlebush",
  careBotanical: "Encelia farinosa",
  careIntro: "is a desert shrub with silver leaves and bright yellow daisy flowers held above the foliage, in winter and spring, usually growing 1–5 feet tall and 2–4 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 2–4 feet wide.",
    "It may drop some leaves in summer when it is dry; that is normal."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/1404/Encelia-farinosa-(Brittlebush)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/1404/Encelia-farinosa-(Brittlebush)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-encelia-farinosa" }
  ]
});

/* care slot: california-sagebrush */
iennCare("Artemisia californica", {
  careCommon: "California sagebrush",
  careBotanical: "Artemisia californica",
  careIntro: "is a shrub with soft, silvery-gray foliage and a pleasant scent, and small flowers in fall, usually growing 3–5 feet tall and 3–5 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 3–5 feet wide.",
    "A little pruning keeps it compact."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/396/Artemisia-californica-(California-Sagebrush)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/396/Artemisia-californica-(California-Sagebrush)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-artemisia-californica" }
  ]
});
/* care slot: deerweed */
iennCare("Acmispon glaber", {
  careCommon: "Deerweed",
  careBotanical: "Acmispon glaber",
  careIntro: "is a perennial with wiry green stems and small yellow pea flowers that age to red, in spring and summer, usually growing 2–3 feet tall and 3 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 3 feet wide.",
    "It may go dormant in late summer; that is normal. It can be cut back then, or in early fall, for fresh growth."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/2296/Acmispon-glaber-(Deer-Plant)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/2296/Acmispon-glaber-(Deer-Plant)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-acmispon-glaber-lotus-sc" }
  ]
});
/* care slot: four-winged-saltbush */
iennCare("Atriplex canescens", {
  careCommon: "Four-winged saltbush",
  careBotanical: "Atriplex canescens",
  careIntro: "is a tough gray-green shrub with small yellow-green flowers in summer and showy clusters of papery four-winged fruit, usually growing 2–4 feet tall and 3–7 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.",
    "Give it room to reach 3–7 feet wide.",
    "It can be used as an informal hedge."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/475/Atriplex-canescens-(Shadscale)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/475/Atriplex-canescens-(Shadscale)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-atriplex-canescens" }
  ]
});

/* care slot: conejo-buckwheat */
iennCare("Eriogonum crocatum", {
  careCommon: "Conejo buckwheat",
  careBotanical: "Eriogonum crocatum",
  careIntro: "is a low, mounding evergreen with silvery woolly leaves and bright sulfur-yellow flower clusters in spring and summer, usually growing 1–3 feet tall and 2–3 feet wide.",
  careBullets: [
    "Give it full sun.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 2–3 feet wide.",
    "Inland, some afternoon shade is often a better fit."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/1495/Eriogonum-crocatum-(Conejo-Buckwheat)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/1495/Eriogonum-crocatum-(Conejo-Buckwheat)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-eriogonum-crocatum" },
    { name: "CNPS Orange County", url: "https://chapters.cnps.org/oc/2018/11/11/eriogonum-crocatum-saffron-buckwheat/" }
  ]
});
/* care slot: morning-glory */
iennCare("Calystegia macrostegia", {
  careCommon: "Morning glory",
  careBotanical: "Calystegia macrostegia",
  careIntro: "is a vigorous native vine with large white to pale-pink trumpet flowers in spring and summer, usually growing 3–10 feet long and 3–6 feet wide.",
  careBullets: [
    "Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.",
    "It grows in most soil types.",
    "Water during establishment, then water occasionally once established.",
    "Give it room to reach 3–6 feet wide. It can climb a fence or spread as a groundcover.",
    "In winter, it can be cut back to control its spread and to encourage new growth."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/707/Calystegia-macrostegia-(Island-Morning-Glory)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/707/Calystegia-macrostegia-(Island-Morning-Glory)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/calystegia-macrostegia" }
  ]
});

/* care slot: showy-milkweed */
iennCare("Asclepias speciosa", {
  careCommon: "Showy milkweed",
  careBotanical: "Asclepias speciosa",
  careIntro: "is a perennial with large clusters of fragrant pink, white, or purple flowers in spring and summer, usually growing 2–4 feet tall and 2–4 feet wide. It is a host plant for monarch caterpillars.",
  careBullets: [
    "Give it full sun.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 2–4 feet wide. It can spread.",
    "It dies back in winter and returns in spring. Leave any caterpillars on the plant."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/439/Asclepias-speciosa-(Showy-Milkweed)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/439/Asclepias-speciosa-(Showy-Milkweed)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-asclepias-speciosa" }
  ]
});
/* care slot: woollypod-milkweed */
iennCare("Asclepias eriocarpa", {
  careCommon: "Woollypod milkweed",
  careBotanical: "Asclepias eriocarpa",
  careIntro: "is a perennial with woolly leaves and clusters of white to cream flowers, often tinted pink, in spring and summer, usually growing 1–3 feet tall and 1–2 feet wide. It is a host plant for monarch caterpillars.",
  careBullets: [
    "Give it full sun to partial shade.",
    "It grows in most soil types.",
    "Water during establishment, then very little once established.",
    "Give it room to reach 1–2 feet wide. It can spread.",
    "It dies back in winter and returns in spring. Leave any caterpillars on the plant."
  ],
  careSourceName: "Calscape (CNPS)",
  careSourceUrl: "https://calscape.org/plant/432/Asclepias-eriocarpa-(Woollypod-Milkweed)",
  careSources: [
    { name: "Calscape (CNPS)", url: "https://calscape.org/plant/432/Asclepias-eriocarpa-(Woollypod-Milkweed)" },
    { name: "Theodore Payne Foundation", url: "https://store.theodorepayne.org/products/theodore-payne-foundation-asclepias-eriocarpa" }
  ]
});

/* Life form + short tagline (max ~8 words) shown on the card; desc is kept as data but not shown. */
var IENN_FORM = { Salvia:["Shrub","Fragrant bee magnet"], Eriogonum:["Shrub","Tough, long-blooming bee favorite"], Hesperoyucca:["Succulent","One spectacular bloom spike"], Baileya:["Wildflower","Silver leaves, sunny daisies"],
  Calystegia:["Vine","Big white trumpets, fast climber"], Encelia:["Shrub","Fast, cheerful yellow daisies"], Eschscholzia:["Wildflower","Golden state flower"], Muhlenbergia:["Grass","Fountain of fine flower spikes"],
  Romneya:["Perennial","Giant fried-egg flowers"], Asclepias:["Perennial","Monarch caterpillar host"], Diplacus:["Shrub","Hummingbird spring show"], Penstemon:["Perennial","Hummingbird flower spikes"],
  Rhus:["Shrub","Glossy evergreen hedge"], Achillea:["Perennial","Lacy, tough lawn alternative"], Datura:["Perennial","Big white evening trumpets"], Artemisia:["Shrub","Silver scent of the hills"],
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
var IENN_DISPLAY_NAMES = { "Sacred datura": "Datura", "Sticky monkeyflower": "Southern bush monkeyflower", "California brittlebush": "Bush sunflower", "Grinnell's beardtongue": "Southern woodland penstemon" };   // keys match case-insensitively

/* Approved care sheets are species entries that carry careBullets (Eric-reviewed only). */
function iennHasApprovedCare(botanical) {
  var x = typeof iennBasics === "function" ? iennBasics(botanical) : null;
  return !!(x && x.careBullets && x.careBullets.length);
}
function iennApprovedCare(botanical) {
  var x = typeof iennBasics === "function" ? iennBasics(botanical) : null;
  return (x && x.careBullets && x.careBullets.length) ? x : null;
}
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
