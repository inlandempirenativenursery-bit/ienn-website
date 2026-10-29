# Fact-check: Purple needlegrass (Stipa pulchra, syn. Nassella pulchra), 2026-10-28

Requested by Eric ("add purple needle grass to the system"). Jepson eFlora and Calflora accept *Stipa pulchra*; USDA PLANTS still uses *Nassella pulchra* (symbol NAPU4), and iNaturalist files it as *Nassella pulchra* (taxon 165659).

**Feed row (Lobo): live.** Catalog id `stipa`, name "Purple needlegrass", botanical `Stipa pulchra`, band `back`, standard sizes and prices (2" $3, 4" $6, Quarter tree pot $10, 1 gal $15), all counts 0/blank, so the card shows as "Coming soon". Basics are in `IENN_BASICS_SPECIES["Stipa pulchra"]` in `data/plant-basics.js`. `IENN_BASICS_ALIAS` also maps `Nassella pulchra` to it (the alias is now resolved before the genus lookup, so a cross-genus synonym works).

**Common name:** "Purple needlegrass" (Calscape, TPF, USDA, iNat); "Purple needle grass" (Calflora, Las Pilitas). Kept Lobo's "Purple needlegrass".

## Sources
- Calscape (CNPS), primary: https://calscape.org/plant/stipa-pulchra
- Jepson eFlora (Columbus, Smith & Goldman 2012): https://ucjeps.berkeley.edu/eflora/eflora_display.php?tid=45644. The site now sits behind a "verify you are human" check that blocks our browser; the treatment text was read from the search-engine copy of that page (stem 3.5–10 dm, inflorescence 18–60 cm, awn 38–100 mm bent 2×, oak woodland/chaparral/grassland, < 1700 m, Mar–Jun).
- Calflora: https://www.calflora.org/app/taxon?taxon=Stipa+pulchra
- Theodore Payne Foundation, nursery listing: https://store.theodorepayne.org/products/theodore-payne-foundation-stipa-nassella-pulchra
- Las Pilitas Nursery: https://www.laspilitas.com/nature-of-california/plants/663--stipa-pulchra
- USDA PLANTS profile: https://plants.usda.gov/plant-profile/NAPU4, and NRCS Plant Guide (Smither-Kopperl 2025): https://plants.sc.egov.usda.gov/DocumentLibrary/plantguide/pdf/pg_NAPU4.pdf
- UCLA / Santa Monica Mountains flora description (glume color): https://smmflowers.org/bloom/ANF-descriptions/Stipa_pulchra_UCLA_SantaMonicas.pdf
- iNaturalist taxon 165659, for photos

## Native status and range
- **California native**, also in Baja California and north into southern Oregon (Jepson, Calflora, USDA). Calscape calls it California's most widespread native grass.
- **Jepson bioregions:** NW, n&c Sierra Nevada foothills, Sacramento Valley, Central West, South Coast, Channel Islands, Western Transverse Ranges, Peninsular Ranges. **Elevation** < 1700 m (USDA guide: sea level to 4300 ft).
- **Habitat:** oak woodland, chaparral, grassland (Jepson); Calscape adds coastal sage scrub, coastal prairie, inland canyons, valleys, foothills and dry meadows.
- **Local tie:** research-grade records around the IE edges (Chino Hills SP, Santa Rosa Plateau).
- **State grass of California** (2004), stated neutrally by Calscape, TPF, Las Pilitas and USDA. Not used on the card.

## How it does in Inland Empire gardens
- **Heat: well supported, so `ie:true` (Heat tough chip).** TPF: "Recommended for dry, hot areas and clay soils", sun exposure Inland-Sun and Inland-Part Sun. USDA: "tolerant of extreme summer heat and drought". Native to the SoCal valleys and foothills around the IE.
- **Summer dormancy:** TPF "summer deciduous/dormant", Las Pilitas "deciduous", USDA "dormant after seed production". Calscape says "Evergreen" but its own text says to cut it back when it turns brown at the end of summer. Expect a golden-tan clump in summer; that's normal, not a sign it needs water.
- **Weeds:** USDA and Las Pilitas both say young plants don't compete well with annual weeds; keep the area weeded the first year.

## Basics values (set)
| Field | Sources | Set | Notes |
|---|---|---|---|
| Type | Calscape: grass, fountain form; USDA: perennial graminoid; TPF: grass, clumping | **Grass** | `IENN_FORM.Stipa = ["Grass",""]` |
| Height | Calscape 3 ft; TPF 2 ft; Las Pilitas 0.7–1.2 m (2.3–4 ft, in seed); Jepson stems 35–100 cm (1.1–3.3 ft); USDA "generally 2 to 3 feet" | **2–3 ft** | Includes flowering stems |
| Width | Calscape 2 ft; TPF 2 ft; Las Pilitas 0.1–0.5 m (to ~1.6 ft) | **1–2 ft** | |
| Sun | Calscape: Full sun (text: "full or part sun"); TPF: Coast-Sun, Inland-Sun, Inland-Part Sun; USDA: full sun and partial shade | **Full sun, Part shade** | |
| Water | Calscape: Very low, max 1×/month once established; TPF: Low; Las Pilitas: dry-land grass; USDA: drought tolerant | **Low (1)** | |
| Soil | Calscape: "virtually every type of soil", drainage medium; TPF: Any (recommended for clay); Las Pilitas: tolerates alkaline soil, clay and seasonal flooding; USDA: droughty soils, clay, serpentine | **Adaptable** | Clay-tolerant too; the field holds one value, and "Adaptable" covers both |
| Bloom | Jepson: Mar–Jun; TPF: Mar–Jun; Calscape: spring, summer; Calflora: bloom chart (not readable as text) | **Sp, Su** | Mostly spring; June counts as early summer |
| Flower color | Calscape: red, green, purple, cream; TPF: none; Las Pilitas: n/a; SMM flora: glumes "tinged purplish red"; Calscape: "named for the color of its young seeds" | (in desc) purple-tinged seed heads | Wind-pollinated grass; color is in the glumes/seed heads, not petals |
| Wildlife | Calscape: 4 butterfly species, also caterpillar host for the same 4 (wood-nymphs, ringlet, Western branded skipper); seeds "attract birds and other wildlife". TPF: Butterflies/Moths, Songbirds, Pollinators. USDA: wind pollinated; forage for deer and elk | **Birds, Butterflies** | "Pollinators" not set: wind-pollinated (USDA), only TPF lists it |
| Pot-friendly | Not listed by Calscape (special uses: deer resistant, groundcover, lawn alternative) or TPF for this species | **no** | |
| Fragrant | Calscape: none | not set | |
| Deer resistant | Calscape, TPF filter | not shown | No deer chip on the site |
| Heat tough (ie) | see above | **yes** | TPF + USDA |
| Pet caution | Calscape: long awns, "pet owners should be aware that they are prickly"; USDA: seeds lodge in dogs' fur and can burrow under skin | in desc | |

**Description** (horticultural and visual only; no cultural, food or medicinal uses): "A fine-leaved bunchgrass with airy, nodding seed heads that open purple-tinged in spring and trail long, twisting awns. Turns golden and rests in summer with little water. The sharp seeds can catch in pet fur, so keep it away from dog runs."

**Genus default** (`IENN_BASICS.Stipa`, `genusLevel:true`) is the same set of values with a short generic description, so any other *Stipa* row (e.g. foothill or nodding needlegrass) gets reasonable basics; check those species separately before adding them.

## Discrepancies (summary)
1. **Height:** TPF 2 ft vs Calscape 3 ft vs Las Pilitas up to ~4 ft in seed. Set 2–3 ft (USDA and the middle of Jepson).
2. **Width:** Las Pilitas ≤ 1.6 ft vs Calscape/TPF 2 ft. Set 1–2 ft.
3. **Evergreen (Calscape) vs summer-dormant (TPF, Las Pilitas, USDA).** Desc says it rests in summer.
4. **Sun:** Calscape's field says full sun only; its text, TPF and USDA allow part sun/shade. Set Full sun + Part shade.
5. **Flower color:** TPF and Las Pilitas list none; Calscape lists red/green/purple/cream. Described as purple-tinged seed heads.
6. **Pollinators:** only TPF; USDA says wind-pollinated. Not set.
7. **Name:** *Stipa pulchra* (Jepson, Calflora, Calscape, TPF, Las Pilitas) vs *Nassella pulchra* (USDA, iNat). Both map to the same basics.

## Photo
**Eric's pick (2026-10-28): the public-domain NPS photo**, because the ID on his own iNat observation is unconfirmed (it's still "Needs ID").
- `assets/plants/purple-needlegrass.jpg` (600×800) + `-400.jpg` (300×400): "Purple Needlegrass" by Santa Monica Mountains National Recreation Area (National Park Service), https://commons.wikimedia.org/wiki/File:Purple_Needlegrass_(9098888940).jpg (source: https://www.flickr.com/photos/santamonicamtns/9098888940). Taken 2013-06-20 in the Santa Monica Mountains. It shows purple seed heads with long awns against the sky.
- **License (checked on the Commons file page 2026-10-28):** public domain, `{{PD-USGov-NPS}}` (a work of the U.S. National Park Service); Flickr Public Domain Mark; FlickreviewR passed 2025-03-18. Credited anyway, on the card ("Photo: NPS, Santa Monica Mountains NRA, public domain") and on `credits.html`, like the CC0 photos.
- The original is already 3:4, so it was resized/recompressed only, with no crop or other edits.
- **Not used:** Eric's own iNat photo (ericbg2, obs 115653475, photo 195193890, 2022-05-05, Zenia CA). The only species-level ID is *Nassella pulchra* by another user; Eric's own ID is Poaceae. Keith (keithwg1) has no observations of this species. Candidates are in `/workspace/ienn-photo-candidates/stipa-pulchra/` (box only).
