# Design systems and hierarchy

## The systems — use these, do not re-derive them

Pick from these lists. Never invent a value that isn't on one.

### Spacing and sizing

Base 16px, built from factors and multiples of it:

```
4  8  12  16  24  32  48  64  96  128  192  256  384  512  640  768
```

Tight at the small end, spreading out at the large end. **No two adjacent values may be
closer than ~25%** — that is what makes the choice obvious. A linear "multiples of 4"
scale fails: it does not help you decide between 120px and 124px.

Use it for margin, padding, width, height, icon sizes, border width — everything spatial.
Fix a small set of opacity values too (e.g. `.05  .1  .2  .4  .6  .8`) for disabled states,
overlays and hover tints, rather than eyeballing a slider each time. Same logic as the other
scales: decide once, reuse everywhere.

### Type scale

```
12  14  16  18  20  24  30  36  48  60  72
```

Not a modular scale built from a ratio (4:5, 2:3, golden ratio). Those produce fractional
pixel values that round inconsistently across browsers and are too sparse for interface
density — hand-picked values, chosen for how they feel, win instead.

**Units: `px` or `rem` only. Never `em`.** `em` is relative to the current font size, so a
`.875em` inside a `1.25em` parent computes to 17.5px — a value not in your scale. The
scale silently stops existing.

### Font weight

Two weights is enough:

- **400 or 500** — body and most UI text
- **600 or 700** — anything emphasized

Nothing below 400 in UI. To de-emphasize, use a lighter *color* or smaller *size* — never a
lighter weight.

### Color

You need far more colors than a five-swatch palette generator gives you.

- **Greys: 8–10 shades.** Almost all of a UI is grey — text, backgrounds, panels, borders,
  form controls. Three or four shades always runs out. Start at a very dark grey, not true
  black (true black looks unnatural).
- **Primary: 5–10 shades**, one or maybe two primaries.
- **Accents: 5–10 shades each** — destructive red, warning yellow, positive green, plus
  whatever else the product needs to distinguish (chart series, calendar events, tags). Ten
  colors × 5–10 shades is normal for a complex UI.

Name them `100` (lightest) → `900` (darkest), base `500`.

**Build the scale in this order:** pick `500` first (for a primary/accent, it should be a
shade that works as a button background). Then find the edges — `900` is usually your text
color, `100` a background tint; an alert component uses both, so design one and read the
two values off it. Then fill `700` and `300` as the perfect compromise between their
neighbours, then `800 600 400 200` the same way.

**Write colors as HSL, not hex.** `hsl(220, 95%, 34%)` and `hsl(220, 65%, 61%)` are
visibly related; `#03369E` and `#507DD7` are not.

**Never generate shades at runtime** with `lighten()` / `darken()`. That is how you end up
with 35 slightly different blues.

### Shadows — five elevations

```css
0 1px 3px  hsla(0,0%,0%,.2)   /* barely raised — buttons */
0 4px 6px  hsla(0,0%,0%,.2)   /* dropdowns */
0 5px 15px hsla(0,0%,0%,.2)
0 10px 24px hsla(0,0%,0%,.2)
0 15px 35px hsla(0,0%,0%,.2)  /* modals */
```

Choose by asking *where on the z-axis does this sit?*, not *what shadow looks nice?*.
Closer to the user = more attention. Shrinking a button's shadow on `:active` makes it feel
pressed; growing a list item's shadow when it's picked up for drag-to-reorder does the
reverse — it reads as "now above its siblings" and doubles as the drag affordance itself.

These five are the default and are fine everywhere. `references/techniques.md` gives a
refined **two-part** version of the same scale — parallel, but not identical values (its top
step is heavier). Use it when shadows are prominent in the design; use these when they
aren't. Don't mix the two in one project.

### Line-height and line length

Line-height is **inversely** proportional to font size, and proportional to line width:

- small text / wide columns → `1.5` to `2`
- large headlines → `1` is fine

Line length: **45–75 characters**, i.e. `max-width: 20em–35em`. This applies to the
paragraph even when the container around it is wider — mixed widths in one content area
look more polished, not less.

(`em` is correct *here* — measure should scale with the text it wraps. The "never `em`" rule
is scoped to the *type scale*, where `em` compounds through nesting. Don't "fix" this.)

### Border radius

Pick one and stay consistent. Small radius = neutral. Large radius = playful. None =
serious/formal. Mixing square and rounded corners in one interface always looks worse.

---

## Hierarchy — the technique that does the most work

Everything on screen sits in a pyramid: primary, secondary, tertiary. When everything
competes, the UI reads as noise. This is what makes a design look "designed" — not styling.

**Size isn't everything.** Leaning on font size alone gives you primary content that's too
big and secondary content that's too small. Use **weight** and **color** to carry emphasis
instead, and keep sizes reasonable.

**Three text colors, maximum:**
- dark — primary content
- grey — secondary content
- lighter grey — tertiary (footnotes, copyright)

All three carry real body-size text, so all three need 4.5:1. "Lighter grey" means the
lightest shade that still clears it — roughly the middle of a 9-step ramp, not the pale end.
The pale shades are for disabled states and large text only.

**Emphasize by de-emphasizing.** When the important element won't stand out and there's
nothing left to add to it, soften what competes with it instead. Fade the inactive nav
items; drop the sidebar's background color so the main content sits forward.

**Actions:** style by hierarchy, not by semantics.
- Primary → solid, high contrast. Usually exactly one per page.
- Secondary → outline, or a low-contrast background.
- Tertiary → styled like a link.

Destructive ≠ big red button. If "Delete" isn't the primary action on the page, give it
tertiary treatment — then make it a big red primary button *inside the confirmation dialog*,
where it genuinely is the primary action.

**Labels are a last resort.** `label: value` gives every piece of data equal weight. Most
data identifies itself by format (`$19.99`, an email address) or by context. Where a label
is genuinely needed, fold it into the value ("12 left in stock", not "In stock: 12"), or
add it as visibly *secondary* content. Exception: on spec-sheet-style pages where users scan
*for the label*, emphasize the label instead.

**Balance weight against contrast.** Solid icons are visually heavy and will out-shout the
text beside them — soften their color to compensate. It works in reverse too: when a 1px
border is too subtle in a soft color but too harsh once you darken it, keep the soft color
and go to 2px. Add weight to fix low contrast; reduce contrast to fix excess weight.

**Visual hierarchy ≠ document hierarchy.** Semantic markup and visual weight are separate
decisions. Section titles are usually *labels*, not headlines — an `h1` at 16px is fine, and
sometimes the title should be visually hidden entirely because the content speaks for itself.

---
