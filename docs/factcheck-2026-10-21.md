# Plant basics fact-check, 2026-10-21 (review only, not committed)
Scope: the 32 live feed plants, checked against data/plant-basics.js on main (29712f1).
Sources: Calscape (https://calscape.org/loc-California/<Genus-species>()), Calflora (https://www.calflora.org/app/taxon?crn=...), Jepson eFlora as a backup.
Values come from published Calscape/Jepson ranges. Only the items flagged below are worth a second look.
Every field not listed below (sun, water, life form, wildlife, description) is OK for that plant.
Policy scan: no description or tagline mentions sacred, ceremonial, Indigenous, drug, or medicinal uses. The "Sacred datura" feed name shows as "Datura". PASS.

| Plant | Field | Current | Source value | Source URL | Verdict |
|---|---|---|---|---|---|
| White sage (Salvia apiana) | bloom | Sp | Apr-Jul (Sp-Su) | https://calscape.org/loc-California/Salvia-apiana-() | minor |
| White sage | wild | hummingbirds (genus) | Mainly bees; hummingbirds occasional | same | minor |
| Black sage (S. mellifera) | wild | hummingbirds (genus) | Mainly bees; hummingbirds minor | https://calscape.org/loc-California/Salvia-mellifera-() | minor |
| Purple sage (S. leucophylla) | w | 4-6 ft | to about 6-8 ft wide | https://calscape.org/loc-California/Salvia-leucophylla-() | minor |
| Cleveland / Hummingbird sage | all fields | as set | matches | Calscape | OK |
| Chaparral yucca (Hesperoyucca whipplei) | h | 2-3 ft | Rosette 2-3 ft; flower stalk 8-14 ft | https://calscape.org/loc-California/Hesperoyucca-whipplei-() | minor (the stalk height isn't shown) |
| Chaparral yucca | desc "then the plant finishes" | monocarpic | Monocarpic for most forms; some subspecies sucker | https://ucjeps.berkeley.edu/eflora/eflora_display.php?tid=79270 | OK |
| Brittlebush (Encelia farinosa) | h/w | 2-4 x 2-4 ft | about 3-5 x 3-5 ft | https://calscape.org/loc-California/Encelia-farinosa-() | minor |
| California brittlebush (E. californica) | bloom | W,Sp | Feb-Jun | https://calscape.org/loc-California/Encelia-californica-() | OK |
| California poppy | bloom | W,Sp | Feb-Sep (Sp-Su peak) | https://calscape.org/loc-California/Eschscholzia-californica-() | minor (add Su) |
| Narrowleaf milkweed (Asclepias fascicularis) | bloom | Su | May-Oct | https://calscape.org/loc-California/Asclepias-fascicularis-() | minor (add F) |
| Showy / Woollypod milkweed | monarch host | yes | Both are monarch hosts | Calscape | OK |
| Sugarbush (Rhus ovata) | h/w | 6-10 ft | 6-15 ft; can become a small tree | https://calscape.org/loc-California/Rhus-ovata-() | minor |
| Datura (D. wrightii) | bloom | Su,F | Apr-Oct | https://calscape.org/loc-California/Datura-wrightii-() | minor (add Sp) |
| Datura | h | 2-4 ft | 2-5 ft | same | OK |
| Coyote brush (Baccharis pilularis) | h | 1-3 ft | Prostrate forms 1-3 ft; upright form 6-10 ft | https://calscape.org/loc-California/Baccharis-pilularis-() | minor (correct only if the stock is the prostrate form) |
| Arizona cypress 'Blue Pyramid' | h/w | 20-40 x 10-20 ft | Cultivar about 20-25 x 12-15 ft | cultivar trade data; https://calscape.org/loc-California/Hesperocyparis-arizonica-() | minor |
| Arizona cypress | "native" status | listed as native | Native to Arizona and nearby areas; the CA presence is limited or disputed | https://www.calflora.org/app/taxon?crn=1987 | check |
| Bush poppy (Dendromecon rigida) | shape vs form | card says SmallTree, label says Shrub | Shrub, 3-10 ft | https://calscape.org/loc-California/Dendromecon-rigida-() | minor (silhouette mismatch) |
| Matilija poppy | form | Perennial (shrub silhouette) | Perennial / subshrub, 3-8 ft, spreads by rhizomes | https://calscape.org/loc-California/Romneya-coulteri-() | OK |
| Desert marigold, Morning glory, Buckwheat, Deergrass, Rock and Sticky monkeyflower, Scarlet bugler, Showy penstemon, Yarrow, CA sagebrush, Woolly blue curls, CA fuchsia | all fields | as set | Within Calscape ranges | Calscape species pages | OK |
| (data) Heteromeles | n/a | entry exists | Not in the feed | n/a | n/a |
| (feed) Narrow-leaf vs Narrowleaf milkweed | duplicate | 2 rows | Same species | n/a | note for Lobo |

## Verified 2026-10-22 (live Calscape pages fetched)
Note: the Calflora crn=1987 link above was wrong; it opens Chenopodium pumilio.

| Plant | Calscape values seen | Change made | URL |
|---|---|---|---|
| White sage | Size 3-5 ft tall, 3-8 ft wide; blooms Spring, Summer; hummingbirds in wildlife list | bloom Sp→Sp,Su; w 3-5→3-8 ft | https://calscape.org/loc-California/Salvia-apiana-() |
| Black sage | Size 3-6 tall, 3-10 wide; blooms Spring, Summer; hummingbirds listed | bloom Sp→Sp,Su (size not flagged, left as is) | https://calscape.org/loc-California/Salvia-mellifera-() |
| Purple sage | Size 2-5 tall, 3-10 wide; blooms Spring, Summer | h 3-5→2-5, w 4-6→3-10; bloom Sp→Sp,Su | https://calscape.org/loc-California/Salvia-leucophylla-() |
| California poppy | Blooms Spring, Summer; 2-24 in tall | bloom W,Sp→Sp,Su | https://calscape.org/loc-California/Eschscholzia-californica-() |
| Narrowleaf milkweed | Blooms Spring, Summer, Fall; 2-3 ft tall, 1 ft wide | bloom Su→Sp,Su,F | https://calscape.org/loc-California/Asclepias-fascicularis-() |
| Datura | Blooms Winter, Spring, Summer, Fall; 1-5 ft tall, 6 ft wide | bloom Su,F→all four; h 2-4→1-5 | https://calscape.org/loc-California/Datura-wrightii-() |
| Brittlebush (E. farinosa) | 1-5 ft tall, 4 ft wide; blooms Spring, Winter | h 2-4→1-5 (width 2-4 fits) | https://calscape.org/loc-California/Encelia-farinosa-() |
| Sugarbush | 7-33 ft tall, 30 ft wide; blooms Winter, Spring, Summer | h/w 6-10→7-15 (low end of the source range; 33 ft is the wild maximum) | https://calscape.org/loc-California/Rhus-ovata-() |
| Chaparral yucca | Size 2-12 ft tall (includes the flower stalk), 2-3 wide; blooms Spring, Summer | h 2-3→2-12; bloom Sp→Sp,Su | https://calscape.org/loc-California/Hesperoyucca-whipplei-() |
| White/Black sage hummingbird icon | Calscape lists Hummingbirds for both (Coyote brush's page does not, so the list is species-specific) | kept | as above |
| Arizona cypress, Coyote brush, Bush poppy | n/a | hidden from the shop at Eric's request; no basics edits | n/a |
| Arizona cypress native status (for the record) | Not on Calscape ("not found"); Calflora's "Hesperocyparis arizonica" search resolves to Cuyamaca cypress (H. stephensonii) | none | https://www.calflora.org/app/taxon?taxon=Hesperocyparis+arizonica |
