---
name: refactoring-ui
description: Design and improve user interfaces using the concrete rules from Refactoring UI (Wathan & Schoger) — constrained spacing/type/color/shadow scales, visual hierarchy through weight and color rather than size, and depth through emulated light. Use when building or styling any UI (web, app, dashboard, landing page, component), when picking font sizes, spacing, colors, shadows or border radius, when designing a color palette or design tokens, and whenever someone says a UI "looks off", "looks amateur", "feels cluttered/plain/unfinished", or asks to "make this look better".
---

# Refactoring UI

Visual design is not talent. It is a small set of systems decisions made **once**, plus a
handful of techniques for creating hierarchy. This skill is those systems and those
techniques.

The single biggest cause of amateur-looking UI is picking values ad hoc — 17px here,
`#3B82F6` there, `lighten(5%)` for a hover state. Design *from a scale*, always.

---

## Required references

Before choosing tokens or styling/reviewing UI, read [references/foundations.md](references/foundations.md) for the original scales and hierarchy rules. These remain required; moving them does not make them optional. Before styling cards, callouts, alerts, list items, timeline steps, or selected states, read [Manicure](../manicure/SKILL.md) and never add a colored or thick left-edge accent stripe.

## The procedure

**1. Start with a feature, not a layout.** Don't design "the app" — you cannot decide
between top nav and sidebar before you know what's in the product. Design one real piece of
functionality (the search form, the message composer), and let the shell emerge.

**2. Detail comes later.** Ignore typefaces, shadows and icons early. Work in **grayscale
first** — it forces hierarchy to come from spacing, contrast and size rather than color.
Add color once the layout works.

**3. Don't over-invest in low fidelity.** Sketches, wireframes and mockups are disposable —
nobody can use a static picture of an app. They exist to explore ideas; abandon them once the
decision is made and go build the real thing.

**4. Design the smallest useful version, then build it.** Work in short design→code cycles.
Don't imply functionality you aren't ready to build — a comment box with an attachments
zone you can't ship yet blocks the whole feature. Nice-to-haves get designed later.

**5. Choose by elimination.** When picking a value from a scale: guess the one you think is
right, then compare it against the neighbour on each side. Two will be obviously wrong. If
an outer option wins, re-run the comparison with that as the new middle.

**6. Start with too much white space and remove it.** Adding space until something stops
looking bad gives you the minimum. Starting generous and trimming gives you the right
amount. Dense UIs (dashboards) are legitimate — but as a deliberate decision, not a default.

**7. Shrink the canvas.** A small component designed on a 1400px artboard tends to sprawl,
because the space is there to fill. Start at ~400px and design the mobile layout first, where
the constraints are real — then bring it to a large screen and relax only what genuinely felt
cramped. You will change less than you expect.

---

## Hard rules

Deviating from these produces a specific, recognizable failure.

1. **Never grey text on a colored background.** Grey-on-white works because it *reduces
   contrast*; grey on color just looks dirty. White-at-reduced-opacity looks washed out and
   disabled, and lets patterns show through the glyphs. Hand-pick a color with the
   background's hue, adjusting saturation and lightness.
2. **Never `em` for the type scale.** `px` or `rem`.
3. **Never generate shades at runtime.** Define them up front.
4. **Never use a percentage width for something that shouldn't scale.** Sidebars get fixed
   widths; the main area flexes. Elements get a `max-width` and only shrink when the screen
   is actually smaller — a login card shouldn't be *wider* at medium screens than at large.
5. **Never scale things proportionally across breakpoints.** Large elements must shrink
   *faster* than small ones. A 2.5em headline sitting on 14px mobile body copy computes to
   35px — far too big; it wants to be 20–24px there. Likewise a button's padding should get
   proportionally tighter as the button shrinks, not scale with its font size.
6. **Always more space around a group than within it.** This is the fix for "which label
   belongs to which field", cramped bullet lists, and headings that look attached to the
   wrong paragraph. Ambiguous spacing is a functional bug, not just an ugly one.
7. **Never use color as the only signal.** Add an icon, a shape, or a text cue. For charts,
   distinguish series by *contrast* (light→dark shades of one color) rather than by hue —
   colorblind users read lightness reliably, hue not so much.
8. **Contrast minimums:** 4.5:1 for normal text. The 3:1 allowance applies only to *large*
   text, which WCAG defines as **24px regular or 18.66px bold** — not 18px. Assume 4.5:1
   unless the text is genuinely that large. When white-on-color fails, flip it: dark colored
   text on a light colored tint (see `references/systems.md`). Separately, **3:1 applies to
   non-text too** (WCAG 1.4.11): if a border is the only thing identifying a control — an
   input outline, a checkbox edge — it needs 3:1 against its background. A hairline that
   merely divides content does not. Those are two different tokens, not one.
9. **Never scale an icon far from its intended size.** A 16–24px icon at 48px looks chunky
   and detail-starved. Put it inside a colored circle instead.

---

## References

**`assets/tokens.css`** — a complete, contrast-verified starting set of all the above as CSS
custom properties: spacing, type, weights, border width, a fixed opacity scale, a 9-shade
cool grey ramp, a 9-shade primary, three accent trios, five elevations, a **semantic role
layer** (`--surface`, `--text-primary`, `--action`…) and a **dark-mode block** that overrides
only those roles. Copy it in and retune
the hues rather than re-deriving the scales from this prose. Reference the roles in
components, not the raw ramps — that is what makes the dark mode work. Every text/surface
pair is verified ≥4.5:1 in both modes and every functional border ≥3:1; the deliberate
sub-threshold shades (disabled, decorative dividers, the large-text-only step) are exempt by
criterion and commented inline.

Load these when the work calls for them:

- **`references/systems.md`** — building a palette from scratch: choosing the base color,
  keeping saturation alive at the light and dark ends, hue rotation, warm/cool greys, and
  the two escape hatches for hitting contrast ratios without ugly color.
- **`references/diagnose.md`** — symptom → fix table. Load first whenever the task is
  *improving existing UI* rather than building new.
- **`references/techniques.md`** — depth and light simulation, two-part shadows, baseline
  alignment, letter-spacing, breaking out of default component shapes, and handling
  user-uploaded images.
