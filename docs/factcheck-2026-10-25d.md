# Fact-check: Grinnell's beardtongue (Penstemon grinnellii), 2026-10-25

Requested by Eric as "penstemon grindelili". The correct spelling is *Penstemon grinnellii*, named for Joseph Grinnell (iNaturalist taxon 78402; USDA symbol PEGR8).

**Feed row (Lobo): not in the Catalog yet.** The basics are ready in `IENN_BASICS_SPECIES["Penstemon grinnellii"]` in `data/plant-basics.js`. They are matched on the exact botanical name, so nothing shows on the site until a Catalog row with botanical `Penstemon grinnellii` exists. With 0 stock, it shows as "Coming soon", like the PR #39 plants.

**Common name:**
- Calscape, iNaturalist and Jepson: "Grinnell's beardtongue". Recommended, in sentence case like the other plants.
- Theodore Payne and Las Pilitas: "Southern woodland penstemon".

## Sources
- Calscape (CNPS), primary source: https://calscape.org/loc-California/Penstemon-grinnellii-() and https://calscape.org/plant/2767
- Jepson eFlora, *P. grinnellii* and its two varieties: https://ucjeps.berkeley.edu/eflora/eflora_display.php?tid=36964
- Theodore Payne Foundation, nursery listing: https://store.theodorepayne.org/products/theodore-payne-foundation-penstemon-grinnellii
- Las Pilitas Nursery: https://www.laspilitas.com/nature-of-california/plants/468--penstemon-grinnellii
- Calflora: https://www.calflora.org/app/taxon?crn=6169
- USDA PLANTS: https://plants.usda.gov/plant-profile/PEGR8
- American Penstemon Society, San Gabriel Mountains article (penstemons.org)
- iNaturalist taxon 78402, for the photo candidates

## Native status and range
- **California native, endemic to California** (Calscape, Calflora).
- **Range:** southern Sierra Nevada, Transverse Ranges (San Gabriel and San Bernardino mountains), Peninsular Ranges (San Jacinto Mountains) and the edges of the Mojave Desert.
- **Elevation:** about 300–2850 m (≈1000–9300 ft).
- **Habitat:** Foothill woodland, Pinyon-juniper woodland, and Yellow pine and Red fir forest, on dry, gravelly or granitic slopes.
- **Local tie:** it is native to the mountains right above the IE. Eric has 2 iNat observations of it in the San Bernardino NF (near Mentone, 2021, and Running Springs, 2024).
- **Two varieties** (Jepson):
  - var. *grinnellii*: 10–60 cm tall; flowers ± white with a pink or lavender tinge, 22–30 mm; May–Aug.
  - var. *scrophularioides*: 45–85 cm tall; flowers blue-violet, 26–35 mm; Apr–Jul; mainly in the s Sierra Nevada and Tehachapi Mountains.
  - Nursery plants in SoCal are usually the pale-flowered type.

## How it does in Inland Empire gardens
- **Heat: uncertain, so `ie:false` (no Heat tough chip).**
  - Theodore Payne lists Inland-Sun and calls it "good for hot, dry gardens".
  - Las Pilitas recommends "cool sun or high filtered shade" and says it "needs perfect drainage".
  - In the wild it is a mid- to high-elevation mountain plant.
  - For IE valley gardens, afternoon shade is the safe advice. Eric's call if his plants have done well in full valley sun.
- **Summer water:** Las Pilitas says it tolerates clay on a slope if not summer-watered, and likes a couple of summer showers in July. Overwatering in summer is the main risk, as with most penstemons.

## Basics values (set)
| Field | Sources | Set | Notes |
|---|---|---|---|
| Type | Calscape: perennial herb; TPF: perennial; USDA: forb/herb or subshrub | Perennial (genus form) | |
| Height | Calscape 4–34 in; Jepson 10–85 cm (4–33 in), by variety; Las Pilitas 0.5–0.7 m (plant ~1.5 ft, flower spikes to 2 ft); TPF 2.5 ft | **1–3 ft** | Range covers the garden size in all sources |
| Width | Las Pilitas 0.5 m (~1.5 ft); TPF 2.5 ft; Calscape gives none | **1.5–2.5 ft** | |
| Sun | Calscape: full sun or part shade; TPF: Coast-Sun and Inland-Sun; Las Pilitas: cool sun or high filtered shade | Full sun, Part shade | |
| Water | TPF: Low; Las Pilitas: drought tolerant, little or no summer water; Calscape gives no value | **Low (1)** | |
| Soil | Calscape: fast drainage, "tolerates a variety of soils as long as adequate drainage is provided"; TPF: sand, fast draining; Las Pilitas: perfect drainage (clay OK on a slope if dry in summer) | Fast-draining | |
| Bloom | Calscape: spring and summer; Jepson: May–Aug (var. *grinnellii*) and Apr–Jul (var. *scrophularioides*); TPF: May–Aug; Las Pilitas: late spring to early summer | Sp, Su | |
| Flower color | Jepson: ± white with a pink or lavender tinge, or blue-violet (by variety); Calscape: purple, lavender, white; TPF: pale, nearly white, tinged pink or lavender; Las Pilitas: pink-violet; penstemons.org: light lavender with purple guide lines | (in desc) pale pink to lavender | |
| Wildlife | Calscape: 197 native bees, 30 butterflies and 4 hummingbird species (likely), 14 moths, and caterpillar host for 18 species; TPF: butterflies/moths, hummingbirds, pollinators; Las Pilitas: "great for a bird garden" | Bees & butterflies, Hummingbirds | Same as the genus default |
| Pot-friendly | Calscape special uses: Containers | yes (genus default) | |
| Fragrant | Las Pilitas lists the flower as fragrant; no other source does | **not set** | Only one source |
| Deer resistant | Calscape, TPF | not shown | The site has no deer chip |
| Evergreen? | TPF: evergreen; Las Pilitas: deciduous | not shown | Sources disagree; it's not a field on the card |
| Heat tough (ie) | see above | **no** | Mountain native; Las Pilitas wants cool sun or filtered shade |

**Description** (horticultural and visual only; no medicinal, ceremonial or cultural uses): "A bushy clump of gray-green leaves with stems of wide-throated, pale pink to lavender flowers striped with purple guide lines. Needs sharp drainage, little summer water and some afternoon shade inland."

**Tagline:** it inherits the genus tagline ("Hummingbird flower spikes"), the same as the other two penstemons. Cards don't display taglines.

## Discrepancies (summary)
1. **Height:** Calscape 4–34 in vs TPF 2.5 ft vs Las Pilitas ~1.5 ft (2 ft in bloom). Set 1–3 ft.
2. **Width:** Las Pilitas ~1.5 ft vs TPF 2.5 ft; Calscape gives none. Set 1.5–2.5 ft.
3. **Sun and heat:** TPF says inland sun and hot, dry gardens; Las Pilitas says cool sun or filtered shade. Set Full sun + Part shade, `ie:false`, and the desc suggests afternoon shade inland.
4. **Evergreen (TPF) vs deciduous (Las Pilitas).** Not shown.
5. **Flower color** varies by variety: pale pinkish-white to lavender (var. *grinnellii*) or blue-violet (var. *scrophularioides*). The desc describes the pale SoCal form.
6. **Common name:** Grinnell's beardtongue (Calscape, Jepson, iNat) vs Southern woodland penstemon (TPF, Las Pilitas).
7. **Fragrance:** only Las Pilitas mentions it. Not set.

## Photos
Not added in this PR. Candidates for Eric to pick from are in `/workspace/ienn-photo-candidates/penstemon-grinnellii/`, with `CANDIDATES.md` (license, author, URL) and `contact-sheet.jpg`:
- 3 of Eric's own (ericbg2, obs 83192704 and 223651067).
- 4 openly licensed backups (CC0 or CC BY 4.0, research grade, SoCal).

Keith (keithwg1) has no observations of this species.
