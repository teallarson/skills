---
name: slice-plan
description: >-
  Transform an existing implementation plan into vertical-slice steps with OODA
  rhythm. Use when a plan feels layered (build models, then API, then UI),
  big-bang, or missing checkpoints — or when the user asks to slice up a plan,
  make it OODA, or break it into vertical slices. For generating a plan from
  scratch, use ooda-plan instead.
---

# Slice Plan

Restructure a plan so every step is (a) a vertical slice — end-to-end user-visible behavior — and (b) an OODA micro-loop — Observe, Orient, Decide, Act. Short loops with real checkpoints beat long plans with a big integration at the end.

## When to Use

- After receiving a multi-step implementation plan and before starting work
- When a plan reads as "build all the X, then all the Y, then wire it up"
- When a plan has no checkpoints between steps — each step assumes the next one's context without verifying it
- When the user asks to "slice up," "OODA-ify," or "make this more iterative"

## Instructions

### 1. Load the Plan

Ask the user where the plan is if it's ambiguous — otherwise pick up the obvious candidate:

- **File path provided:** read it
- **Plan in current conversation:** use the most recent structured plan output (e.g. from plan mode), or the most recent multi-step proposal the assistant made
- **Neither is obvious, or both exist:** ask: "Slice the plan at `<path>`, or the one we just discussed in this conversation?"

Confirm out loud which plan you're working from before diagnosing, so the user can correct you before you invest effort.

### 2. Diagnose Anti-Patterns

Read through the plan once and flag every instance of these smells. Don't fix yet — just list them so the user can see the scope of the rewrite.

| Smell                     | What it looks like                                                               | Why it matters                                                   |
| ------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Horizontal slicing        | Step named by layer: "Add migrations," "Scaffold the API," "Build the UI"        | Integration risk deferred; nothing demoable until the end        |
| Big-bang design           | Long design/architecture step before any running code                            | Decisions get locked in before reality checks them               |
| Missing Observe           | No step reads the current state of the code / runs existing tests / checks what  the last step produced before starting                                                                                | Plan assumes instead of verifying; drift compounds               |
| Missing Orient            | Plan is fully specified up front and never revised between steps                 | New information from prior steps can't change direction          |
| Not user-observable       | Step produces an artifact no user could see or demo ("add types," "set up store") | Can't tell if the step worked; no reversion signal               |
| Acceptance = "code exists" | Done criteria is "function written" rather than "behavior verifiable"            | Step can pass while being broken end-to-end                      |
| "Wire it up at the end"   | Explicit or implicit final integration step                                      | Classic horizontal smell — the risk was always in the wiring     |

If the plan has **none** of these, tell the user the plan is already OODA/vertical-slice shaped and stop. Don't rewrite a healthy plan.

### 3. Rewrite Each Step

For every step that has a smell, rewrite it into this shape:

```text
### Step N: <user-observable outcome>

**Observe.** What's currently true in the code / tests / prior-step output. Name the files or commands to check. Ground in artifacts, not memory.

**Orient.** What changed since the plan was written (or since the last step). Are the assumptions still valid? What did the last slice reveal?

**Decide.** The one vertical slice to build next, thinnest version that delivers the outcome. Stubs and hardcoded values are fine — the slice must *run* end-to-end, not be complete.

**Act.** Implement the slice through every layer it touches (UI → API → DB, or whatever the stack is). Verify with a concrete signal: a test passes, a curl returns the expected shape, a user can click the thing and see the result.
```

Rules for the rewrite:

- **Name each step by user-observable outcome**, not layer. "User can archive a single note" — not "add archive endpoint."
- **Each step must be independently shippable and independently revertable.** If reverting step N breaks step N-1's value, they were one slice, not two.
- **Collapse or split as needed.** Three horizontal steps ("model," "API," "UI") usually become one or two vertical slices. Conversely, a step that touches many unrelated features should split.
- **Defer cross-cutting concerns** (auth, validation, error paths, polish) to later slices unless they're load-bearing for the current slice.
- **Preserve the user's intent.** You're restructuring the sequence, not redesigning the feature.

### 4. Show the Transformation

Present the rewritten plan alongside a short summary of what changed:

```text
## Sliced Plan: <plan title>

### What changed

- Merged steps 2–4 (migrations + API + UI) into one vertical slice: "User sees their first archived note in the sidebar"
- Split step 5 into two slices because it touched unrelated features
- Added Observe checkpoints between every slice
- Moved auth handling from step 1 to a dedicated later slice (not load-bearing for the first slices)

### Revised steps

[... full rewritten plan in the Step N shape above ...]

### Anti-patterns still present (by user choice)

- Step 6's acceptance criterion is still somewhat fuzzy — flagged but left because the user wanted to leave the final polish step open.
```

### 5. Offer to Write It Back

Ask the user: "Want me to overwrite the original plan file, write to a new `*.sliced.md`, or leave the output here for you to copy?" Default to writing a sibling `*.sliced.md` if the original is a file on disk — non-destructive.

If the plan came from the current conversation (not a file), just leave it in the output and let the user copy it.

## Related skills

- **ooda-plan** — write a fresh plan in vertical-slice OODA form
- **lean-pr-review** — walk through a PR slice-by-slice before merge
