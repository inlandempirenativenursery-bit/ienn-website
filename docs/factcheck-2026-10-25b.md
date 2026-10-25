# Plant basics fact-check, 2026-10-25b: Blue grama (Buffalo grass excluded)

**Decision 2026-10-25: Eric excluded Buffalo grass (*Bouteloua dactyloides*) because it is not native to California.** Its basics entry was removed, and it is hidden by name and botanical (`IENN_HIDDEN_PLANTS` / `IENN_HIDDEN_BOTANICAL`), so the feed row (id `buffalograss`) never shows even if it stays in the sheet. Its findings below are kept for the record.

Feed rows from Lobo: Catalog row 31, id `grama`, is "Blue grama (Bouteloua gracilis)". Row 32, id `buffalograss`, is "Buffalo grass (Bouteloua dactyloides)".
Both rows have 0 stock, so they show as "Coming soon". `data/plant-basics.js` matches on these exact botanical names (genus `Bouteloua` plus species entries).
All sources were checked 2026-10-25 (PDT). The text is horticultural and visual only. Taglines are not shown.

## Native status (Eric decides; nothing is hidden)

| Plant | California native? | Inland Empire? | Evidence |
|---|---|---|---|
| Blue grama | **Yes** | **Native to San Bernardino County, but its mountains and the eastern Mojave, not the IE valley floor** | Calflora (crn 1131) lists it as native to California. Calscape: "In California, it is found primarily in arid mountains of San Bernardino County." Theodore Payne: San Bernardino Mountains and the eastern desert mountains (Ivanpah, New York, Clark Mtns). iNaturalist has 47 research-grade wild records in CA (mostly Mojave National Preserve and San Bernardino County mountains), 0 wild records in an IE-valley box (Fontana/Riverside/Ontario/Redlands area), and only 6 cultivated ones there. |
| Buffalo grass | **No** | **No** | Calscape has no page (404). Jepson eFlora has no treatment ("No results found"), and Calflora has no taxon record. POWO's native range is central Canada to Mexico, including AZ, NV and UT but not California. USDA PLANTS (BODA2) lists it as native to the lower 48 only as a whole. FEIS: Great Plains. iNaturalist has 0 wild research-grade CA records and 4 cultivated. In California it's a planted turf grass; 'UC Verde' is a UC Davis/UC Riverside selection made for California lawns. |

## Basics

| Plant | Field | Source says | Site value | Note |
|---|---|---|---|---|
| **Blue grama**, https://calscape.org/loc-California/Bouteloua-gracilis-() | Common name | Calscape: "Blue Grama" | Blue grama | matches |
| | Life form | Grass (warm-season perennial bunchgrass) | Grass | |
| | Size | 6–24 in tall, 2 ft wide | 6 in–2 ft tall, 2 ft wide | |
| | Bloom / color | Summer, Fall; yellow, with eyelash-shaped seed heads | Su, F | |
| | Sun | Full Sun, Partial Shade | Sun / part sun | |
| | Water | Very Low; max 2x/month in summer | **Low–moderate (range 1–2)** | Eric 2026-10-25: show a range (summer up to about twice a month) |
| | Soil | Variety of soils with adequate drainage; drainage fast/medium | Fast-draining | |
| | Wildlife | 2 skipper butterflies (Juba, Western branded skipper), visitors and larval hosts | **Butterflies** | Eric 2026-10-25: butterflies only, no bees |
| | Pots | Containers, Groundcover, Lawn alternative | Pot-friendly | |
| | Heat tough | Sunset zones include 18–24; cold to 15 °F; arid mountains | Heat tough | |
| **Buffalo grass**: not on Calscape. Sources: FEIS https://www.fs.usda.gov/database/feis/plants/graminoid/boudac/all.html, USDA PLANTS BODA2, UC turf report https://turfgrass.ucr.edu/sites/default/files/2023-08/ctc45_12.pdf | Common name | USDA/FEIS: "buffalograss" | Buffalo grass | spelling differs only |
| | Life form | Warm-season perennial shortgrass that spreads by stolons | Grass | |
| | Size | Foliage 2–5 in (to 12 in in the southern plains); flower stalks 4–8 in | 2–5 in tall, 1–2 ft wide | **uncertain width**: it spreads into a mat, so 1–2 ft is the spread of one plug, not a hard limit |
| | Bloom | Apr–Jun, males to late summer; inconspicuous | Sp, Su | |
| | Sun | UC: low shade tolerance | Full sun | |
| | Water | FEIS/UC: very drought resistant | Low (1) | |
| | Soil | FEIS: all textures, most common on clay; alkaline | Clay OK | |
| | Wildlife | none documented in these sources | none | |
| | Heat tough | FEIS: drought-, heat- and cold-resistant | Heat tough | |
| | Dormancy | UC: long winter dormancy (tan) | in desc | |

The size panel now shows heights under 1 ft in inches (Blue grama: "6 in–2 ft tall").
