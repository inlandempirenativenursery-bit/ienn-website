# Starter-packs teaser: flower outline shapes (2026-10-25)

`STARTER_TEASER_SHAPE` options `calochortus`, `salvia` and `trichostema` are stylized silhouettes. They follow the genus descriptions in Jepson eFlora. All use the lilac 3-D treatment: gradient face, gloss band, a copy of the flower 6px lower as the thick edge, a drop shadow, and a press-sink where the edge collapses. Only the painted flower is clickable.

| Shape | Jepson eFlora | Feature followed |
|---|---|---|
| `calochortus` (mariposa lily, face-on) | https://ucjeps.berkeley.edu/eflora/eflora_display.php?name=Calochortus | "sepals generally < petals, generally ± lanceolate; petals generally widely wedge-shaped … nectary near base"; perianth "open, bell-shaped or ± rotate". Drawn as 3 broad wedge/fan petals alternating with 3 shorter, narrow lanceolate sepals behind them, with a darker nectary mark near each petal base and a cup-shaped center that holds the text. |
| `salvia` (corolla, side view) | https://ucjeps.berkeley.edu/eflora/eflora_display.php?name=Salvia | "corolla 2-lipped, upper lip 2-lobed to entire, lower lip with 3 spreading lobes, middle lobe generally expanded; fertile stamens 2, attached in throat". Drawn with a small sage calyx, the tube, a hood-like upper lip (the Lamiaceae family description says "flat to hood-like"), a big expanded middle lobe holding the text with two smaller side lobes, and 2 stamens in the throat. |
| `trichostema` (woolly bluecurls) | https://ucjeps.berkeley.edu/eflora/eflora_display.php?name=Trichostema | "corolla … lobes 5, lowest a generally reflexed lip; stamens 4, attached near throat, generally much-exserted, ascending between upper corolla lobes, generally arched". Drawn as 4 small upper lobes, a large lower lip holding the text, and 4 long stamens that rise between the upper lobes and arch over the top. |

Simplified for a phone-size button. Not a botanical illustration.

## Mariposa lily variants (Eric: "more transparency, or maybe a side shot")

Default stays `calochortus` (face-on, solid) until Eric picks.

- `calochortus-glass`: the same face-on lily, with petals at about 62% opacity and sepals at about 50%. A blur of the page behind is clipped to the flower outline, using `backdrop-filter` with a mask where the browser supports it. It also has a thin darker-lilac outline, a 3-D edge at 42% opacity, the same soft white gloss, and a frosted cream disc behind the text.
- `calochortus-side`: a side view based on Jepson's open bowl- or cup-shaped flower. Three broad wedge petals rise into a cup with slightly recurved tips. The front petal holds a frosted text plate and a nectary mark near its base. Two narrower sepals spread below and behind, and a short sage pedicel sits underneath. The flower uses the same translucent treatment as the glass variant.

You can preview either one with `?teaser=now&teasershape=calochortus-glass` or `?teaser=now&teasershape=calochortus-side`.

## Aster (Eric's pick, now the default: `STARTER_TEASER_SHAPE = "aster"`)

Eric's reference image was used for style only. Nothing was copied or embedded from it, and its ring, text and yellow are not used.

The aster is a bold, flat-graphic, face-on flower with 8 broad, overlapping lilac petals. Each petal has 4 soft scallops across its tip. Thin, darker-lilac lines radiate from the disk onto the petals. The large honey disk (`--honey`, the same color as Add to tray) has a slightly bumpy edge, and the Baloo heading and subline sit inside it in dark brown.

The shape is built in `teaser.js` at runtime, so no large path data is stored. It keeps the same 3-D treatment as the other flowers: a darker-lilac offset edge, a drop shadow, a 6px press-sink and dismissal by tap or Escape.

### Aster, juicier pass (Eric: "soften the yellow, a little transparency, juicier")
- **Disk:** soft buttery gold in a domed radial gradient (#fcefc4 → #f6d98a → #eac46c), with a soft white dome gloss. The subline text (#4a2c12) has a contrast of 7.6:1 against the darkest gold and 11:1 against the highlight.
- **Transparency:** petals are about 88% opaque and the disk about 90%. Behind them, a backdrop blur is clipped to the flower's outline where the browser supports it. The 3-D edge is 9px deep and about 82% opaque. The text is HTML laid on top, so it stays crisp.
- **Petals:** shading from the center to the tip makes them look plump, and each petal has a curved white sheen on its outer part. The drop shadow is softer and larger.
- **Motion:** the flower springs in, scaling from 0.6 up to 1.08 and settling at 1 with a tiny wobble, then breathes slowly (scale 1 to 1.022 over 4.8s). A press squishes it (`translateY(6px) scale(.96)`) before dismissing. With `prefers-reduced-motion`, it simply appears, with no spring, breathing or squish.
