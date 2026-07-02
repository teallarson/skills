---
name: ooda-plan
description: >-
  Generate a fresh implementation plan as a sequence of vertical slices, each
  structured as an OODA micro-loop (Observe-Orient-Decide-Act) with explicit,
  testable acceptance criteria. Use when the user asks to write a plan, plan a
  feature, draft an OODA plan, plan as vertical slices, or whenever new work
  needs an iterative demoable plan rather than a horizontal big-bang one. For
  restructuring an existing plan, use slice-plan instead.
---

# OODA Plan

Generate a new implementation plan from scratch where every step is (a) a **vertical slice** — end-to-end user-observable behavior through all layers it touches — and (b) an **OODA micro-loop** (Observe → Orient → Decide → Act) with **explicit acceptance criteria** that can be checked before moving on.

Short loops with real checkpoints beat long plans with a big integration at the end. The first slice is a **walking skeleton** — the thinnest end-to-end path that runs and can be demoed, even if every layer is stubbed or hardcoded. Subsequent slices add depth to that skeleton, each one independently shippable and revertible.

Sister skill: `slice-plan` takes an already-written plan and re-shapes it. This skill writes the plan fresh.

## When to Use

- **Plan mode:** When in plan mode (Cursor Plan Mode or an explicit planning session), use OODA structure unless the user asks for a different format.
- User asks to "plan," "draft a plan," "write out how we'd build this," or specifically mentions OODA / vertical slices.
- Starting a feature where the implementation is non-trivial (3+ discernible moves) and shipping it incrementally matters.
- Any time you would otherwise produce a horizontal plan ("add models, then API, then UI, then tests").

Skip this skill for one-shot changes (single file, single function, no user-observable surface) — just do the work.

## Workflow

### 1. Clarify the Outcome (briefly)

Before planning, confirm three things out loud. Ask the user only what's genuinely missing — don't interrogate.

- **Who** is the user of this change (end user, internal dev, ops, automated caller)?
- **What** user-observable behavior defines "done"? State it in one sentence: *"A \<role\> can \<action\> and see \<result\>."*
- **Constraints** that shape the slices: hard deadlines, systems that can't change, non-goals, known unknowns.

If the user's request is already specific on all three, skip asking and restate them in your response so they can correct you before you invest in the plan.

### 2. Identify the Walking Skeleton

The first slice is the thinnest path that:

- Runs end-to-end through every layer the feature will ultimately touch.
- Produces an observable signal a user or test can see.
- Is allowed to hardcode values, skip edge cases, and ignore polish.

Write it first, explicitly labeled **Slice 0: Walking skeleton**. If you can't name a walking skeleton in one sentence, the outcome from step 1 is too big — ask the user to narrow it, or split it.

### 3. Enumerate Subsequent Slices

For each remaining capability, add a slice that:

- **Delivers one user-observable increment** — name it by what the user can newly do or see, not by the layer touched.
- **Is independently shippable and revertible.** Reverting slice N must not destroy slice N-1's value.
- **Touches every layer needed for that increment** (UI → API → data → infra, or whatever the stack is). No "UI-only slice" or "DB-only slice."
- **Defers cross-cutting concerns** (auth, validation, error paths, observability, perf, polish) to their own later slices unless load-bearing for the current one.

Aim for 3–7 slices for a medium feature. If you have more than ~10, you're either slicing too thin or the feature should be split into multiple plans.

### 4. Write Each Slice in the OODA Template

Use this exact shape for every slice:

```text
### Slice N: <user-observable outcome>

**Observe.** What's currently true in the code / tests / prior-slice output. Files to open, commands to run, signals to check before starting. Ground in artifacts, not memory.

**Orient.** What the prior slice revealed or what assumptions to reality-check now. Flag risks and open questions. If this is Slice 0, orient against the *existing* codebase, not the plan.

**Decide.** The single thinnest change that delivers the outcome. State what's in scope and what's explicitly deferred. Stubs and hardcoded values are fine — the slice must *run* end-to-end, not be complete.

**Act.** The concrete moves: files to change, tests to add, endpoints to wire, UI to render. Keep it a list of intents, not a line-by-line script.

**Acceptance criteria.**
- Given <starting state>, when <action>, then <observable result>.
- <2–5 criteria total — enough to prove the slice, not a spec dump.>

**Verification signal.** How you'll *demonstrate* the criteria pass in this environment: test command, curl invocation, UI step, log line, etc. One concrete check, runnable in under a minute.
```

Rules for acceptance criteria:

- **Testable.** Every criterion must be checkable by a human or machine without interpretation. "Renders quickly" → "renders in under 200ms on the seed dataset."
- **Observable.** Describe user- or caller-visible behavior, not implementation. "Returns 201 with the created id" — not "calls `INSERT INTO notes`."
- **Given/When/Then is the default form.** Drop it only when a plain bullet is clearly more readable (e.g., "Endpoint exists at `POST /notes` and returns 201"). Never use vague words: *fast, clean, intuitive, robust, properly.* Quantify or replace them.
- **Scoped to this slice only.** If a criterion only makes sense once a later slice lands, it belongs in that later slice.

### 5. Sanity-Check the Plan

Before presenting, run the plan through this checklist. Fix or flag every miss.

| Check | Pass looks like |
| --- | --- |
| Each slice is named by outcome, not layer | "User archives a note" — not "Add archive endpoint" |
| Slice 0 is a true walking skeleton | Runs end-to-end; could be demoed; allowed to be ugly |
| Each slice has an Observe step | Names specific files, commands, or signals to check |
| Each slice has acceptance criteria | Testable, observable, not "code exists" |
| Each slice is independently revertible | Reverting it doesn't break the previous slice's value |
| No final "wire it all up" slice | Integration risk is absorbed into each slice, not deferred |
| Cross-cutting concerns have their own slices | Auth, validation, errors, perf, docs are either load-bearing or deferred explicitly |

If any check fails and you can fix it, fix it. If you can't fix it without more info from the user, keep the slice but flag the issue inline in a `**Caveat.**` line — don't hide it.

### 6. Present and Offer to Save

Output the plan in this structure:

```text
## Plan: <short title>

**Outcome.** A <role> can <action> and see <result>.
**Non-goals.** <what's explicitly out of scope>
**Key risks / unknowns.** <2–4 bullets>

### Slice 0: Walking skeleton — <outcome>
...
### Slice 1: <outcome>
...
### Slice N: <outcome>
...

### Open questions
- <anything that would change the plan if the user answered>
```

Then ask: *"Want me to save this to a plan file (default: `./plan.md` or `./docs/plans/<slug>.md`), keep iterating here, or start on Slice 0?"* Default to leaving it in chat unless the user signaled they want it on disk.

## Anti-Patterns to Avoid

Do not produce any of these. If the user's request would naturally lead to one, restructure instead.

| Anti-pattern | Why it fails |
| --- | --- |
| Horizontal slicing ("Step 1: migrations, Step 2: API, Step 3: UI") | Integration risk deferred; nothing demoable until the end |
| Big-bang design doc before any slice | Decisions locked in before reality checks them |
| "Wire it up at the end" final slice | Classic horizontal smell — the risk was always in the wiring |
| Acceptance = "code exists" or "function written" | Step can pass while being broken end-to-end |
| Vague criteria (*fast, clean, nice UX*) | Untestable; everyone reads them differently |
| Slice named by layer or artifact | Hides whether a user gains anything |
| More than ~10 slices | Either slicing too thin, or this should be multiple plans |

## Example (abbreviated)

For a request like *"Let users archive notes":*

```text
## Plan: Archive notes

**Outcome.** A signed-in user can archive a note and see it disappear from their main list.
**Non-goals.** Unarchive flow, bulk archive, archived-notes view.
**Key risks / unknowns.** List query already filters by tombstone — need to check if we can reuse that path.

### Slice 0: Walking skeleton — Archiving a hardcoded note removes it from the list
**Observe.** Read `notes/list.tsx` and `api/notes/list.ts` to confirm current query shape.
**Orient.** Existing list already filters `deleted_at IS NULL`; an `archived_at` column can ride the same pattern.
**Decide.** Add `archived_at` column, one `POST /notes/:id/archive` endpoint that stamps it, one button wired to a single hardcoded note id. Skip auth, errors, optimistic UI.
**Act.** Migration for `archived_at`; endpoint stamps timestamp; list query filters `archived_at IS NULL`; button calls endpoint and refetches.
**Acceptance criteria.**
- Given the note with id=1 exists and is unarchived, when I click Archive on it, then it disappears from the list within one refetch.
- Given I reload the page, then the archived note remains hidden.
**Verification signal.** `curl -XPOST localhost:3000/notes/1/archive` returns 204; reloading the app shows one fewer note.

### Slice 1: Any note can be archived from its row
...

### Slice 2: Archive survives auth + permission checks
...
```

## Output Length Guidance

- A plan for a small feature: 3–5 slices, total output ~150–300 lines.
- A plan for a medium feature: 5–8 slices, ~300–500 lines.
- Anything longer: stop and ask the user if the scope should be split into multiple plans instead.

## Related skills

- **slice-plan** — restructure an existing horizontal plan
- **lean-pr-review** — walk through a PR slice-by-slice before merge
