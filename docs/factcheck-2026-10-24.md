# Plant basics fact-check, 2026-10-24: Sticky monkeyflower → Southern bush monkeyflower (*Diplacus longiflorus*)

Eric confirmed the stock sold as "Sticky monkeyflower" is *Diplacus longiflorus*, not *D. aurantiacus*. Lobo updated the sheet, so the live feed now sends
"Sticky monkeyflower (Diplacus longiflorus)". The frontend data was keyed and updated to match (`data/plant-basics.js` species entry
`"Diplacus longiflorus"`, with an alias so an older cached feed that still says *aurantiacus* gets the same basics and shows *longiflorus*).

Sources (fetched 2026-10-24):
- Calscape: https://calscape.org/loc-California/Diplacus-longiflorus-() (title "Southern Bush Monkeyflower"; also lists Sticky Monkeyflower, Bush Monkeyflower and Inland Monkeyflower as common names)
- Calflora: https://www.calflora.org/app/taxon?crn=13544 (*Diplacus longiflorus* Nutt., southern bush monkeyflower; shrub; accepted by JEPS, PLANTS and POWO)
- USDA PLANTS: https://plants.sc.egov.usda.gov/home/plantProfile?symbol=DILO6 (southern bush monkeyflower; shrub/subshrub)

| Field | Before (genus-level Diplacus) | Calscape (*D. longiflorus*) | After | Verdict |
|---|---|---|---|---|
| Life form | Sub-shrub | Shrub (USDA: shrub/subshrub) | Shrub | fixed |
| Height | 2–4 ft | 1–3 ft tall | 1–3 ft | fixed |
| Width | 2–3 ft | 1–3 ft wide | 1–3 ft | fixed |
| Bloom | Spring, Summer | Spring, Summer | Spring, Summer | OK |
| Flower color (data only, not shown) | not set | Yellow, Orange | desc says pale-yellow to orange | added |
| Sun | Full sun / part sun | Full Sun, Partial Shade | Sun / part sun | OK |
| Water | Low (1) | Extremely Low, Very Low, Low | Low (1, the lowest level) | OK |
| Soil | Fast-draining | Tolerates a variety of soils as long as adequate drainage is provided | Fast-draining | OK |
| Wildlife | Bees & butterflies, Hummingbirds | 36 native bees, 9 butterflies, Anna's hummingbird | same | OK |
| Pot-friendly | yes | Special uses: Containers | yes | OK |
| Heat tough (IE) | yes | Southern/central CA, 0–7500 ft; chaparral, coastal sage scrub, Joshua tree woodland | yes | OK |
| Species-specific | genusLevel: true | n/a | genusLevel: false | fixed |

Policy: the new description is horticultural and visual only (no medicinal, ceremonial or Indigenous-use text); taglines are not shown.

Photo (`assets/plants/sticky-monkeyflower.jpg`, Eric's catalogue photo `photos/sticky-mf.jpg`, filed under *D. aurantiacus* in
`docs/photo-choices/README.md`): large, wide-lobed pale yellow-orange flowers on narrow, dark green leaves. That is consistent with *D. longiflorus*
(Calscape: "large, yellow to orange flowers"), but the photo has no location/ID data, so this is a visual check only. Not swapped.

## Also hidden 2026-10-24
Cleveland sage (*Salvia clevelandii*), Purple sage (*S. leucophylla*), Hummingbird sage (*S. spathacea*) and the "Other" feed row (no botanical) are hidden
from the shop by exact name and exact species. Black sage and White sage stay visible.

## Common name (2026-10-24)
Calscape, Calflora and USDA PLANTS all use "Southern bush monkeyflower" as the standard name for *D. longiflorus*. Eric chose to rename it on the site.
The live feed now sends "Southern bush monkeyflower (Diplacus longiflorus)". The frontend keeps a fallback display override (`IENN_DISPLAY_NAMES`, case-insensitive)
for any old cached feed. The photo alias (`southern-bush-monkeyflower` → `sticky-monkeyflower.jpg`) and the pin/sort keywords work with either name.
