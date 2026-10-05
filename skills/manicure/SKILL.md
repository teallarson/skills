---
name: manicure
description: Remove the colored stripe down the left edge of cards, callouts, alerts, list items, and selected nav items ("fingernails"), and add a rule so they are not added back. Use when the user says "manicure", "remove the fingernails", "get rid of the left border accents", or complains about a colored left bar on a design. Also read before styling any card, callout, alert, or list item, so you don't add one.
---

# Manicure

A fingernail is a colored or thick stripe down the left edge of one element. It shows up as:

- `border-left: 4px solid <accent>` or `border-inline-start` in CSS
- `borderLeft: "3px solid ..."` in a JS style object
- Tailwind `border-l-2`, `border-l-4`, `border-s-4`, `border-l-[3px]`, `border-l-<color>`
- `box-shadow: inset 3px 0 0 <color>`
- An absolutely positioned bar: `absolute inset-y-0 left-0 w-1 bg-primary`, or a `::before` with `left: 0; width: 3px; background: ...`

The user does not want any of them, ever. This skill has two jobs: remove every one in scope, then make sure no agent adds one back.

## Never add one

This applies whether or not the skill was invoked. When styling a card, callout, alert, list item, timeline step, or selected state, do not put a stripe on the left. Show emphasis or status some other way:

| The stripe was saying | Use instead |
| --- | --- |
| Nothing (decoration) | Nothing. Delete it. |
| Status (warning, error, success) | The existing alert/badge variant, a status icon, or a tinted background from the design system |
| "This one is selected" | A background highlight and/or heavier text weight |
| Category or type (e.g. two kinds of hook) | A small colored dot, icon, or badge next to the label |

Pick from what the design system already has. Don't invent a new decoration to replace the old one.

The bundled scripts require Bash and ripgrep with PCRE2 support (`rg --pcre2`); `hook.sh` also requires `jq`. Resolve `<skill-base-dir>` to the directory containing this SKILL.md, including when it is installed under a plugin-qualified name.

In Claude Code, the optional `hook.sh` can enforce this when the user explicitly installs it. This package does not register it. It runs after every Edit, Write, and MultiEdit to a frontend file, checks only the text just written, and sends any match back to Claude to fix. Both `hook.sh` and `find-fingernails.sh` read their patterns from `patterns.txt`, so add new patterns there.

## 1. Find them

Run the bundled detector on the paths in scope (default: the whole repo):

```bash
<skill-base-dir>/find-fingernails.sh <path> [<path> ...]
```

It prints `file:line:match` and exits 1 when anything matches. It can't see multi-line `::before` rules, so also search CSS for pseudo-elements pinned to the left:

```bash
rg -n -A6 '::?before' -g '*.{css,scss,sass,less}' | rg 'left:\s*0'
```

## 2. Sort the hits

The detector over-matches on purpose. Read each hit and sort it:

- **Fingernail — remove.** A stripe that decorates one card, callout, alert, list item, row, step, or selected item. Colored, thicker than 1px, or both. A legend swatch that mimics the stripe counts too.
- **Not a fingernail — leave.** A 1px neutral border that separates two layout regions (sidebar from content, split panes), tree-view indent guides, a scrollbar track, a table cell border, or a straight rule beside a blockquote or pull quote (standard typography). These are structure, not decoration.

The quick test: if the element with the left border also has rounded corners, a background, or its own box, it's a fingernail. A rounded corner bends the border into a curved sliver, which is the shape that gives these their name. That goes for quotes too: a quote in a rounded, tinted box with a left bar is a fingernail.

If a hit could go either way, look at it rendered before deciding. If it's still unclear, list it for the user instead of guessing.

## 3. Remove them

For each fingernail:

1. Delete the stripe classes or properties, including the paired color (`border-l-4` **and** `border-l-yellow-600`; `border-left-width` **and** `border-left-color`).
2. If the stripe carried meaning, move the meaning to one of the replacements in the table above.
3. If the element had `border-l-*` layered on a full `border`, keep the full border only if the element still needs an outline without the stripe.
4. Remove any ternaries, variables, or props that only existed to pick the stripe color, and update legends or docs that show the stripe.
5. Don't restyle anything else while you're there.

## 4. Check the result

- Re-run the detector on the same paths. Every remaining hit should be one you sorted as "leave."
- Run the project's lint and type check.
- If a dev server or Storybook is available, screenshot each changed screen and confirm the stripe is gone and the layout didn't shift. Say so if you couldn't.

## 5. Keep them from coming back

Add a rule where the project's agents will read it. Use the project's existing agent instructions file: `AGENTS.md`, `CLAUDE.md`, `.claude/rules/*.md`, `.cursor/rules/`, or whichever the repo already uses. If it has a UI or design rules file, put it there. Add this, adjusted to the file's style:

```markdown
## No left-edge accent stripes

Never put a colored or thick stripe on the left edge of a card, callout, alert, list item, or selected item (`border-l-4`, `border-left: 4px solid`, `border-s-*`, `inset` box-shadow stripes, or an absolute `left-0 w-1` bar). Show status with the design system's variants, icons, or a tinted background, and show selection with a background highlight.
```

Don't add the rule twice. Check first.

Then offer, but don't install without asking, a check that fails when a new one lands: add `find-fingernails.sh` (copied into the repo's scripts directory) to the project's lint or pre-commit, scoped to the UI source directories, with the known "leave" hits excluded.

## Report

Tell the user:

- What you removed, as `file:line` links, and what replaced any stripe that carried meaning
- Hits you left alone and why (one line each)
- Where you added the rule
- What you ran to check, and what you saw

End the report with the count on its own line: `💅 Trimmed N fingernails.` Count one per element that had a stripe, not per class or line removed. Write `1 fingernail` for one, and `No fingernails to trim.` when there were none.
