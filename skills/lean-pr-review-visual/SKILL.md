---
name: lean-pr-review-visual
description: >-
  lean-pr-review plus a live visual pass on UI slices: prototype CSS tweaks in
  a real browser, capture before/after screenshots, and propose the exact
  diff. Use for a visual PR review, UI, Storybook, or design-system PRs,
  before/after design feedback, or a one-shot visual review.
disable-model-invocation: true
---

# Lean PR Review — Visual

Read [../lean-pr-review/SKILL.md](../lean-pr-review/SKILL.md) first and run its phases as written, in either of its [two modes](../lean-pr-review/SKILL.md#two-modes). This file covers only what the visual pass adds.

Never edit repo files to try a visual change. Prototype in the browser, and change the repo only when the user asks you to apply a diff.

## Browser tools

- **chrome-devtools MCP** (`mcp__chrome-devtools__*`) runs the visual pass by default. Before Phase 3, call `list_pages` to confirm it is connected. If it isn't, tell the user to enable it and continue as a text-only review, saying so in the report.
- **Not playwright.** Its `browser_*` tools take different arguments than the recipes use.
- **agent-browser** (CLI, optional) runs the evidence probes in Phase 3. When the target needs a login, agent-browser runs the whole visual pass, screenshots included, because chrome-devtools launches its own browser and can't receive a login session. Read [reference/evidence.md](reference/evidence.md) before the first agent-browser command.

## Phase 0 — Find the running UI

While locking scope, find where the changed UI renders: Storybook, the dev server, or a branch preview URL. Check whether it needs a login, which decides the browser tool. Reuse a tab the user already has open and signed in.

If nothing is running, ask the user to start Storybook or the dev server, or to give a preview URL. In a full run, don't ask: check `list_pages` and the usual ports once, and if nothing answers, do a text-only review. The report then says the visual pass was skipped, which UI surfaces went unchecked, and the one command that would have started one.

## Phase 3 — Visual pass on UI slices

After the design and bug passes, run the visual pass on each slice that renders UI; for other slices write "no rendered surface". Read [reference/visual-tweaks.md](reference/visual-tweaks.md) before the first one. It has the tool calls for injecting CSS, capturing, and hover states.

A tweak can come from you or from the user ("make the tooltip name bolder"); both get the same loop. When the user asks for one, prototype and show it instead of agreeing in chat. Feedback on a prototype ("more padding", "B but heavier") restarts the loop at step 3.

1. Open the story or screen. Confirm it is the PR branch, not `main`.
2. Say in one sentence what you will change and why.
3. Inject CSS to prototype it.
4. Capture before and after with the same tight, zoomed crop. For a matter of taste, capture 2–3 variants.
5. Write the exact diff, using the component's real class names or style values.
6. Let the user react. Repeat from step 3 until they choose.

Note every screenshot path and variant diff before leaving the slice. In a full run, those notes are all Phase 5 has.

Also check the rendered layer for:

- custom CSS where a design-system component or token already does the job
- wrapper divs, extra grid levels, or absolute positioning where the layout primitive is enough
- animation or hover effects that no state needs
- a hardcoded spacing or color value that copies a token
- a variant prop with one call site

Visual items are usually Minor or Question. A real legibility or accessibility problem is Medium. A suggestion the user waves off stays a slice note. A tweak the user asked for and approved is a finding, labeled as a requested change.

### Evidence probes (optional)

If agent-browser is installed, run one batch per UI slice ([reference/evidence.md](reference/evidence.md)) to measure claims otherwise argued from source: a memo that does nothing, a `useState` copy holding stale data, a value that copies a token, a hidden field still sent.

- Evidence goes on an existing finding as one line (a rule ID or a number). It never creates a finding. No raw JSON in the report.
- An axe violation raises a Minor to Medium.
- A clean result and a probe that couldn't run (no CLI, old version, production build) each get one line. Don't report a skip as clean.

## Full run

- Nobody is there to make a taste call. Put every variant in the report as Option A / B / C, with a recommendation and one line on why. Don't cut to one option, and don't wait for a choice.
- The report has no requested-change findings, since those only come from conversation.

## Phase 5 — Report

Use [reference/report-visual.html](reference/report-visual.html) instead of lean-pr-review's report.html and deploy commands, and follow "Build the report" in [reference/visual-tweaks.md](reference/visual-tweaks.md) for encoding, image sizes, and deploy commands.

- Embed screenshots as base64 in the one HTML file. Never link image files or ask the user to drag anything in.
- Crop each shot tight and render it about 400–600px wide.
- Each visual finding gets a caption per image (15 words at most), a one-line rationale saying what the change improves, and the diff. Label variants and say which you'd pick. If it needs more, it is two findings.
- Don't describe what the screenshots already show or narrate the prototyping.
- lean-pr-review's length budgets apply unchanged.
- Deploy with the flypod CLI only after the user confirms, in every mode.
