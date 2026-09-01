---
name: lean-pr-review-visual
description: >-
  Lean PR review PLUS live visual tweak feedback for UI changes. Walks a PR one
  slice at a time (earn-your-keep + bug hunt, same as lean-pr-review), and for
  any slice that renders UI, prototypes concrete visual polish live in the
  browser with chrome-devtools MCP — injecting CSS, capturing before/after
  screenshots at readable zoom, and proposing the exact class/style diff. Ends
  with a polished standalone HTML artifact that embeds the before/after shots
  inline (base64, no drag-and-drop) and ships to flypod.dev from the CLI.
  Gate-driven by default, or a single uninterrupted full run when the user
  doesn't want to babysit it. Use when a PR touches rendered UI (components,
  Storybook, design system) and the user wants design/visual feedback alongside
  code review, or asks for a "visual PR review", a one-shot visual review, or
  "before/after design feedback" artifact.
disable-model-invocation: true
---

# Lean PR Review — Visual

Everything `lean-pr-review` does — understand every change, challenge what doesn't earn its keep, hunt bugs, ship a polished HTML artifact — **plus a live visual pass** for UI slices: prototype the tweak in a real browser, show before/after, hand back the exact diff.

This is still **sequential and slice-by-slice**, and by default **conversational and gate-driven**. Do not dump findings. Do not auto-apply visual changes to the repo. Do not generate the HTML until the user says the review is complete.

When the user asks for a **full run**, the gates come off but the sequence doesn't — see [Full run](#full-run-no-gates).

## Prerequisite: the chrome-devtools MCP server

The visual pass runs by default through the **`chrome-devtools` MCP server** — its tools are named `mcp__chrome-devtools__*` (e.g. `mcp__chrome-devtools__navigate_page`, `mcp__chrome-devtools__evaluate_script`, `mcp__chrome-devtools__take_snapshot`, `mcp__chrome-devtools__take_screenshot`, `mcp__chrome-devtools__hover`, `mcp__chrome-devtools__click`, `mcp__chrome-devtools__list_pages`).

- **Confirm it's connected before Phase 3** (a quick `mcp__chrome-devtools__list_pages` proves the browser is reachable). If it isn't, tell the user it needs to be enabled and degrade to a text-only lean review — don't silently skip the visual work.
- **Reachable is not the same as usable.** It launches its own browser, so on a login-gated target it lands on a sign-in wall no session file can fix. Check whether the target needs auth while locking scope; if it does, run the visual pass in agent-browser instead of degrading the review.
- **Use chrome-devtools tools specifically — not playwright.** A `playwright` MCP is frequently connected alongside it with similarly-named tools (`browser_navigate`, `browser_evaluate`, `browser_snapshot`, `browser_hover`) but **different APIs**. The reference snippets are written for chrome-devtools' shapes (`evaluate_script` takes a function; `take_snapshot` returns element `uid`s; `hover`/`take_screenshot` accept a `uid`). Mixing in playwright tools will not match the recipes.

### Optional second tool: agent-browser

The evidence pass in Phase 3f uses the [`agent-browser`](https://github.com/vercel-labs/agent-browser)
CLI over Bash. It is **additive and optional**. Both tools can clip a screenshot to a single element —
chrome-devtools via `take_screenshot(uid)`, agent-browser via a positional selector,
`screenshot [selector] [path]` — so neither owns the visual work by capability alone. Full division of
labor and the version floor: [reference/evidence.md](reference/evidence.md).

**If the target needs a login, agent-browser owns the whole visual pass.** The two tools drive separate
browsers and do not share auth: chrome-devtools launches its own instance with no set-cookie tool, so a
storageState or profile handed to agent-browser never reaches it. Establish this in Phase 0, not at the
first screenshot.

Point it at its own session (`--session review-<pr>`) so it never contends for the tab a human is
watching.

**Pass `--json` to every probe.** Some print `✓ Done` and drop their payload without it — and a swallowed
`react tree` reads exactly like the empty tree you get from a production bundle, which will talk you out
of the two probes that carry the synced-state lens.

## What this adds over lean-pr-review

For any slice that renders UI, after the earn-your-keep and bug passes you run a **visual pass**: open the component in a running browser (Storybook, dev server, or preview URL), prototype proposed tweaks by injecting CSS live, and capture before/after screenshots. Visual suggestions become findings with a picture attached, not just prose.

The final artifact is a **visual comparison report**: before/after screenshots embedded inline, a one-paragraph rationale per idea (*what it improves*, not just what changes), and the exact code diff to apply it.

Two hard requirements the user cares about, baked into the workflow:

1. **No drag-and-drop.** Screenshots are embedded as base64 directly in the HTML, and the file ships to flypod via the CLI (`npx flypod <file>`). The human never drags an image into an editor or a file into a browser.
2. **Readable screenshots.** Component UI is small. Every screenshot must be captured as a tight, zoomed crop of the part under discussion (see [reference/visual-tweaks.md](reference/visual-tweaks.md)) — never a full-page shot where the change is 12px tall. In the report they render at a restrained **~400–600px width** (tuned by detail), not stretched to fill the page.

## Full run (no gates)

`lean-pr-review`'s [Two modes](../lean-pr-review/SKILL.md#two-modes) applies here unchanged: on
*full run*, *one-shot*, *just do the whole thing*, or *don't stop and ask*, every gate comes off
except the flypod deploy confirmation, and rigor and length budgets stay exactly where they are.

The visual pass has two wrinkles a gateless run has to handle on its own:

- **No one to react to a taste call.** The loop's step 6 (user reacts, you iterate) has no
  counterpart. So: prototype the variants anyway, capture all of them, and **ship them into the
  artifact labeled Option A / B / C with an explicit recommendation and one line of why**. Don't
  collapse to a single option to avoid the ambiguity, and don't stall waiting for a preference.
- **No one to start the dev server.** Check for a reachable target once via
  `mcp__chrome-devtools__list_pages` plus the usual ports. If nothing is running, **do not block** —
  run the full text review and say plainly in the artifact that the visual pass was skipped, which
  surfaces it covered, and the one command that would have enabled it. A skipped visual pass is a
  reported gap, not a stopped run.

A full run cannot produce human-requested tweaks — those only exist in conversation. The report
carries agent-found visual findings only, and that's expected, not a shortfall.

## Be concise — this is a hard requirement

All of [lean-pr-review](../lean-pr-review/SKILL.md)'s concision rules apply verbatim: one fact
once, cut the trace and keep the verdict, no throat-clearing, length scales with severity, no
hedging in both directions, bullets over prose whenever the content is enumerable. The **length
budgets** in that skill's Phase 5 bind this artifact too — a comparison block does not buy you
extra words.

This variant has one extra advantage and one extra temptation:

- **Show, don't tell — you have pictures.** The before/after *is* the argument. Caption what the
  shot shows, add one line on what it improves, paste the diff. Do not write a paragraph
  re-describing in words what two images already prove.
- **The temptation is narrating the prototyping.** "I injected a 4px padding, took a shot, then
  tried 8px, then…" is process, not finding. Report the variants you're offering and the one you'd
  pick. The loop stays in the conversation; only the outcome reaches the artifact.

Per visual finding: **caption ≤ 15 words per image, rationale one line, diff only.** If you need
more than that, the change is doing two things and wants to be two findings.

## Phases 0–4.5 — same as lean-pr-review, with a visual pass

Follow `lean-pr-review` Phases 0–4 exactly, including the **Phase 4.5 red-pen pass** that cuts before
the artifact renders — a visual review adds screenshots and probe output, so it runs longer and needs
that pass more, not less. The shared references still apply:

- **Earn-your-keep lenses:** [../lean-pr-review/reference/lenses.md](../lean-pr-review/reference/lenses.md) — run **synced vs. derived state** and **overengineering / speculative generality** on every
  slice, including the non-UI ones. UI slices are where synced state hides best (a `useState`
  mirror of query data, a hand-kept copy of a design token) and where speculative generality
  looks like a prop nobody passes.
- **Bug hunt playbook:** [../lean-pr-review/reference/bugs.md](../lean-pr-review/reference/bugs.md)
- **Frontend idiom & framework-smell playbook:** [../lean-pr-review/reference/frontend-idioms.md](../lean-pr-review/reference/frontend-idioms.md) — this variant reviews UI code by definition, so run the Framework idioms lens (derive-don't-sync, redundant state, sentinel inputs, over-memo, TS faux pas) on every rendering slice.
- **Tone & voice:** [../lean-pr-review/reference/tone.md](../lean-pr-review/reference/tone.md)

The only structural change is an added step in Phase 3.

### Phase 0 addition — is there something to look at?

While locking scope, also establish **where the UI runs**:

- Storybook (local `bun run storybook` / `make dev`, or a deployed branch preview)
- The dev server (dashboard on `:5173`, etc.)
- A Vercel/branch preview URL

If nothing is running and the PR touches UI, ask the user to start Storybook or the dev server, or supply a preview URL, before Phase 3. *(Full run: don't ask — degrade to a text-only review and report the skipped visual pass in the artifact.)* Confirm the browser is reachable via `mcp__chrome-devtools__list_pages` (see the prerequisite above). If the user already has a tab open and authenticated, **reuse it** — don't force a re-login.

### Phase 3e — Visual pass (UI slices only)

Run this after 3b (earn-your-keep) and 3c (bugs), for slices that render UI. Skip with a one-line "no rendered surface" for pure logic/config/test slices.

**Ideas come from either side — treat both the same way.** A visual tweak to prototype can originate from:

- **The agent** — you spot a spacing/hierarchy/alignment/weight/contrast/state-legibility issue during the walkthrough and propose it.
- **The human** — the user says "try making the tooltip name bolder," "what if the count column were fixed-width," "can you space those out more." This is a first-class input, not a side comment. **Run the full loop below on it**, exactly as if you'd found it yourself — prototype it live, capture before/after, offer variants if it's a taste call, record the diff, and carry it into the Phase 5 report. Do not just discuss it in prose or say "yes that would work" — go show it.

When the user gives directional feedback on something you already prototyped ("more padding," "try it left-aligned," "I like B but heavier"), that's a new turn of the same loop: re-inject, re-capture, re-offer. Keep iterating until they're happy, then lock the chosen variant's diff.

The loop, for an idea from either source:

1. **Locate the component live.** Navigate to its story or the screen that renders it. Confirm you're looking at the branch under review, not `main`.
2. **State the change in plain language** before touching anything — what's being adjusted and, for an agent-found issue, why (tie it to a lens: readability, proportionality). For a human-requested tweak, restate it so you're aligned on what you're about to try.
3. **Prototype the tweak live** by injecting CSS — do not edit repo files during the walkthrough. See [reference/visual-tweaks.md](reference/visual-tweaks.md) for the inject/capture/reset mechanics and every gotcha (Storybook iframe, styles lost on navigation, zoom for readability, triggering hover/tooltip states, resetting between shots).
4. **Capture before → after** at readable zoom. Offer 2–3 variants when the direction is a matter of taste (this session did exactly that: right-aligned vs space-between vs styled-chevron).
5. **Record the exact diff** to apply it — real classNames / style values from the component, not "tweak the padding."
6. **Let the user react and iterate.** They may prefer a variant, reject it, ask for another, or push the direction further. Loop back to step 3 as needed. Keep the screenshots and diffs in the running notes buffer for Phase 5.

**Also run the earn-your-keep lenses on the rendered layer**, not just the logic:

- Bespoke CSS where a design-system component or token already does it (Pattern fit / reuse)
- Wrapper divs, extra grid levels, or absolute positioning where the layout primitive suffices
- Animation, transition, or hover choreography nobody asked for and no state needs
- A hardcoded spacing/color value duplicating a token — the synced-vs-derived smell in CSS
- A variant prop with one call site

Classify visual items with the same severity scale (usually **Minor** or **Question**; **Medium** if it's a real legibility/a11y problem). A visual suggestion the user waves off is a slice note, not a finding — but a tweak the user *asked for* and approved belongs in the report as a finding (often framed as "requested change" rather than a critique).

**Stop after each slice** as usual. Do not advance until the user says go. *(Full run: no stop — but still record the slice verdict, the screenshots, and every variant diff in the notes buffer before moving on. Those files are the only thing Phase 5 has to work from.)*

### Phase 3f — Evidence pass (optional, UI slices)

Three of the lenses make claims about runtime behavior from reading source: over-memoization,
synced state, and hardcoded values duplicating a design token. This pass measures them instead
of arguing them. Recipes and the preflight: [reference/evidence.md](reference/evidence.md).

One `agent-browser batch` per UI slice covers the cheap probes:

- **`a11y --selector <sel>`** — axe-core on the changed subtree. Turns "is this a real
  legibility problem or my taste?" into a rule ID, and promotes a Minor to Medium on evidence.
- **`get styles <sel>`** — computed CSS against the token set (`get styles :root` dumps every
  custom property). Proves a hardcoded value duplicates a token.
- **`network requests --type xhr,fetch`** — settles the *"hidden control but the field is still
  sent"* bug from [bugs.md](../lean-pr-review/reference/bugs.md) by reading the actual payload.
- **`react renders`** / **`react inspect`** — render counts and live props/hooks/state, for any
  finding that claims a memo is pointless or a `useState` mirror holds stale data. Needs a dev
  build; empty output against a production bundle is expected, not a failure.

**This pass never blocks.** No CLI, wrong version, no dev build, nothing serving the UI — note
the skip in one line and carry on. Evidence attaches to a finding you already have; it does not
manufacture new ones, and raw JSON never reaches the artifact.

**Distinguish "the probe found nothing" from "the probe didn't run."** They report almost identically
and mean opposite things — a clean axe result is a review output worth a line, while a probe that
silently returned nothing is a gap to say out loud, not a pass. Before concluding a React probe is
unavailable, confirm you passed `--json` and that `react tree` really is empty rather than unprinted.

## Phase 5 — Visual comparison artifact

Only after the completion gate. *(Full run: no gate — go straight here once the last slice is done.)*

This variant's report interleaves the standard review findings with **visual comparison blocks**. Use [reference/report-visual.html](reference/report-visual.html) as the skeleton — it extends the lean-pr-review report with a before/after comparison component.

1. Read [reference/report-visual.html](reference/report-visual.html) for structure and the comparison-block markup.
2. Read [../lean-pr-review/reference/tone.md](../lean-pr-review/reference/tone.md) for voice, severity chips, and finding format.
3. **Embed screenshots as base64** — never link to files, never expect a drag-drop. Follow the encoding recipe in [reference/visual-tweaks.md](reference/visual-tweaks.md) (including the macOS narrow-no-break-space filename gotcha — encode via Python, not shell globbing).
4. Fill the template:
   - **Masthead + verdict + "one thing to weigh"** — same as lean-pr-review.
   - **Findings at a glance** — table with anchor links; bugs first, then visual/design items.
   - **The findings** — numbered cards. UI findings carry a **before/after comparison block** and, below it, a short *why this is better* line and the exact code diff.
   - **What's solid** + footer.
5. Every comparison block needs: a **caption per image** (what the shot shows / what the problem was), a one-line **rationale** (what it improves), and the **diff** to apply. When there are variants, label them (Option A / B) and say which you'd pick and why.
6. Run `/impeccable polish` on the HTML if available — single self-contained file, no external deps, images inline.
7. **Ship it from the CLI** (no drag-and-drop):
   ```bash
   npx flypod <file>.html          # first deploy → prints the live URL
   npx flypod update <file>.html   # subsequent pushes → same URL, new version
   ```
   `flypod update` with no folder fails ("No build output folder found") — always pass the file explicitly. Give the user the live URL and note it's ephemeral (14 days) unless they `flypod login` to claim it.

## Conversational rules (unchanged + visual)

- One slice at a time — never dump findings.
- Explain before judging; read the codebase instead of asking what you can look up.
- **Prototype visual tweaks live, never in the repo** — the browser is the sketchpad. Repo edits only happen if the user later says "apply it."
- **Visual ideas come from both sides.** When the user asks for a tweak, prototype and show it — don't just agree in prose. Their request runs the same loop as an issue you found.
- Offer real variants for taste calls; don't present one option as the only answer.
- Keep a running notes buffer (markdown) with screenshot paths + diffs → becomes the HTML.

## Anti-patterns for the reviewer (agent)

All the lean-pr-review anti-patterns, plus:

- **Full-page screenshots where the change is invisible** — zoom to the element or the detail. Unreadable shots defeat the entire artifact.
- **Editing repo files to prototype a visual tweak** — inject CSS live instead; edits are a separate, explicit step.
- **Answering a user's visual request with prose** ("yes, that would look better") instead of prototyping it and showing before/after. If they asked for a tweak, go run the loop.
- **Linking screenshots or expecting a drag-drop** — embed base64 so the artifact is self-contained and ships as one file.
- **Forgetting styles are lost on navigation/reload** — re-inject after every Storybook navigation (see reference).
- **Writing a paragraph where the before/after already makes the point** — the picture is the
  argument; the words are a caption and a rationale line.
- **Narrating the prototyping loop** in the artifact — variants and the recommendation ship, the
  play-by-play doesn't.
- **Reviewing only the pixels** — a UI slice still gets the synced-vs-derived and overengineering
  lenses on its code.
- **Presenting one visual option as gospel** when it's a matter of taste — show variants, give a recommendation.
- Generating the HTML before the completion gate (conversational mode).
- **Stalling a full run on a taste call** — prototype every variant, recommend one, move on.
- **Aborting a full run because nothing's serving the UI** — degrade to text and report the gap.
- **Deploying to flypod without asking** — the one confirmation that survives every mode.
- **Blocking a review because agent-browser is missing or a probe came back empty** — the
  evidence pass is optional; note the skip and move on.
- **Reading a probe's non-JSON output** — several discard their payload and print only `✓ Done`,
  which you will misread as a negative result.
- **Concluding the React probes are dead** without first confirming `--json` and
  `open --enable react-devtools`. An unprinted tree and an empty tree look the same.
- **Pasting raw probe JSON into the artifact** — quote the number or the rule ID, one line.

## Integration

- **Shared review engine:** `lean-pr-review` Phases 0–4 and its references (lenses, bugs, tone).
- **Visual workflow + gotchas:** [reference/visual-tweaks.md](reference/visual-tweaks.md)
- **Evidence recipes (agent-browser):** [reference/evidence.md](reference/evidence.md)
- **Report skeleton (with comparison block):** [reference/report-visual.html](reference/report-visual.html)
- **Final polish (optional):** `/impeccable polish <path-to-html>`
- **Requires the `chrome-devtools` MCP server** (`mcp__chrome-devtools__*`) for the visual pass — see the prerequisite section. If it's unavailable, degrade gracefully to a text-only lean review and say so. Do not substitute playwright tools; their APIs don't match the reference recipes.
