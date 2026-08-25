# Evidence pass — agent-browser recipes

Three lens claims are normally arguable — over-memoization, synced state, and
token duplication — because they're assertions about runtime behavior made by
reading source. This pass measures them instead.

**Optional.** If the CLI isn't installed, skip the pass, say so in one line, and
review as normal. Never block a review on tooling.

## Preflight

```bash
agent-browser --version      # need >= 0.30
```

`a11y`, `diff`, `batch`, `react`, and `skills` all landed after 0.9 — an older
install silently lacks the entire pass. To upgrade: `npm i -g agent-browser@latest`
(Node >= 24), then `agent-browser install` to fetch Chrome for Testing.

**Flags churn.** This CLI is pre-1.0 and ships several releases a week. The CLI
describes itself — `agent-browser skills get core` prints version-matched usage.
If a recipe below errors, ask the CLI; don't guess at a flag.

## Division of labor with chrome-devtools MCP

Both drive Chrome. They are not interchangeable here:

| Job | Tool | Why |
|---|---|---|
| Tight cropped before/after shots | chrome-devtools MCP | `take_screenshot(uid)` clips to one element. `agent-browser screenshot` has `--full` / `--annotate` but no element clip — full-page shots where the change is 12px tall are the exact failure this skill forbids |
| Live CSS prototyping | chrome-devtools MCP | headed browser, human watching, iterative — that's the sketchpad |
| Evidence | agent-browser | one batch call, compact text, no per-tool round trips |

Give agent-browser its own session so it never fights the tab a human is watching:
`--session review-<pr-number>`.

## The batch, per UI slice

```bash
agent-browser open --enable react-devtools --session review-<pr> <story-or-route-url>
agent-browser --session review-<pr> batch --json \
  "a11y --selector <changed-component-selector>" \
  "get styles <changed-component-selector>" \
  "network requests --type xhr,fetch"
```

`batch --json` returns an ordered array with per-command `success` / `error`, so one
failing probe doesn't cost you the others.

## What each probe settles

**`a11y --selector <sel>`** — vendored axe-core, no network. Returns violations with
the rule ID, impact, failing node HTML, and fix guidance. This is what converts *"is
this a real legibility problem or just my taste?"* into a WCAG rule ID. A hit here
promotes a Minor to Medium on evidence, not vibes. *(Verified.)*

**`get styles <sel>`** — computed CSS. On `body` or `:root` it dumps the full set of
CSS custom properties, i.e. the design tokens. Diff a component's computed value
against the token set: a hardcoded `#888` sitting next to an `--accents-4: #888` is
the synced-vs-derived smell in CSS, proven rather than suspected. *(Verified.)*

**`network requests --type xhr,fetch`** then `network request <id>` for the body —
settles the `bugs.md` item *"UI gating mismatched to request payload: hidden control
but field still sent."* Read the actual body instead of tracing the code. *(Verified.)*

**`react renders start` → interact → `react renders stop --json`** — render profile
via `onCommitFiberRoot`. Use it on any finding that claims a memo is pointless or a
component re-renders too much: if removing the `useMemo` moves the count by zero, the
memo doesn't earn its keep and you can say so with a number.

**`react tree --json`** and **`react inspect <fiberId> --json`** — fiber tree, then
props, hooks, state, and source for one component.

**`--json` is not optional.** The plain-text renderer swallows the tree and prints only
`✓ Done`; the content lives at `.data.tree` (and `.data.text` for `inspect`). A bare
`react tree` looks like a failure when it worked fine.

`inspect` returns four things, and the hooks block is the useful one — hooks are listed
**in call order, indexed, typed, and with their current values**:

```
AccordionRoot #76
props:
  className: "flex w-full flex-col"
  multiple: false
  children: [<AccordionItem />, <AccordionItem />, <AccordionItem />]
hooks:
  [0] LayoutEffect: () => {}
  [1] Memo: []
  Controlled: undefined (6 sub)
  [11] Memo: {value: [], disabled: false, orientation: "vertical"}
rendered by: Accordion > hookified > unboundStoryFn
```

So a `Memo:` holding a trivial literal is over-memoization you can read off the fiber,
and a `State:` holding a value its source has already moved past is the synced-state
bug, observed rather than inferred. Custom hooks appear as named entries with sub-hook
counts.

`source` follows **the fiber**, not your repo — inspecting a library component points at
the bundled dep. Walk up to your own wrapper to get a citable file:line.

Requires `open --enable react-devtools` (the hook must install before page JS) **and a
development build** — Vite dev server and Storybook yes, deployed preview no. Two
distinct failures, don't conflate them: `✗ No React renderer attached` means the hook is
missing or React hasn't booted (often a bad URL rendering a blank page), whereas a valid
tree that is genuinely empty means what it says.

## Optional: regression shots against main

```bash
agent-browser diff url <main-preview-url> <branch-preview-url> --screenshot
agent-browser diff screenshot --baseline before.png -o diff.png
```

Phase 3c asks *"what regresses vs `main`?"* — currently answered by reading code.
`diff url` answers it in pixels. Needs both a base and a head deploy preview, so it
only applies when the PR has one.

## Reporting evidence

Evidence attaches to an existing finding — it does not become its own finding. One
line, quoting the number or the rule ID:

> **Evidence** — axe `color-contrast`, impact serious, on `.tool-count` (3.9:1).

An empty probe is worth one line too, because a checked-and-clean result is a real
review output: *"axe clean on the changed subtree; render count unchanged without the
memo."* Do not paste raw JSON into the artifact — the length budgets still bind.
