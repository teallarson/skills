---
name: ooda-plan
description: >-
  Write an implementation plan as vertical slices, each an OODA loop
  (Observe, Orient, Decide, Act) with testable acceptance criteria. Use when
  the user asks to write a plan, plan a feature, draft an OODA plan, or plan as
  vertical slices, or when new work needs an incremental plan instead of a
  layer-by-layer one. For an existing plan, use slice-plan.
---

# OODA Plan

Write a plan where each slice is end-to-end, user-observable behavior through every layer it touches, and each slice is an Observe, Orient, Decide, Act loop with acceptance criteria checked before the next slice starts. To restructure a plan that already exists, use [slice-plan](../slice-plan/SKILL.md).

In plan mode, use this format unless the user asks for another. Skip the skill for one-shot changes (one file or function, nothing a user can observe) and do the work.

## 1. State the outcome

Confirm three things. Ask only for what is missing; if the request already covers all three, restate them so the user can correct you.

- **Who** uses the change: end user, internal dev, ops, or an automated caller.
- **Done**, in one sentence: "A <role> can <action> and see <result>."
- **Constraints**: deadlines, systems that can't change, non-goals, known unknowns.

## 2. Write Slice 0: walking skeleton

Slice 0 is the thinnest path that runs through every layer the feature will touch and produces a result a user or test can see. It may hardcode values, skip edge cases, and look ugly. Label it `Slice 0: Walking skeleton`.

If you can't describe Slice 0 in one sentence, the outcome is too big. Ask the user to narrow or split it.

Don't write a design doc before Slice 0.

## 3. Add the remaining slices

Each slice:

- Is named by what the user can newly do or see ("User archives a note"), not by a layer or file ("Add archive endpoint").
- Can ship and be reverted on its own. Reverting slice N leaves slice N-1 working.
- Touches every layer that increment needs. No UI-only or DB-only slices, and no final "wire it all up" slice.
- Leaves auth, validation, error paths, observability, performance, and polish to later slices of their own, unless the current slice can't work without them.

Aim for 3 to 7 slices. If you need more than about 10, or the plan passes about 500 lines, ask the user whether to split it into several plans.

## 4. Write each slice in this template

For a filled-in slice, read [reference/archive-notes-example.md](reference/archive-notes-example.md).

```text
### Slice N: <user-observable outcome>

**Observe.** What is true now in the code, tests, or prior slice's output. Name the files to open, commands to run, and signals to check.

**Orient.** What the prior slice revealed, which assumptions to check now, risks, open questions. For Slice 0, orient against the existing codebase.

**Decide.** The smallest change that delivers the outcome. Say what is in scope and what is deferred. Stubs are fine; the slice must run end-to-end.

**Act.** Files to change, tests to add, endpoints to wire, UI to render. A list of intents, not a line-by-line script.

**Acceptance criteria.**
- Given <starting state>, when <action>, then <observable result>.
- (2 to 5 criteria)

**Verification signal.** One concrete check that runs in under a minute: a test command, curl call, UI step, or log line.
```

Acceptance criteria rules:

- Each one can be checked without interpretation. Replace "renders quickly" with "renders in under 200ms on the seed dataset." Don't use fast, clean, intuitive, robust, or properly.
- Describe behavior a user or caller sees ("returns 201 with the created id"), not implementation ("calls `INSERT INTO notes`"). "Code exists" is never a criterion.
- Use Given/When/Then unless a plain bullet reads better.
- Only include criteria that can pass once this slice lands. Anything that needs a later slice goes in that slice.

## 5. Check the plan

Before presenting, confirm:

- Every slice is named by outcome.
- Slice 0 runs end-to-end and could be demoed.
- Every Observe step names specific files, commands, or signals.
- Every slice has criteria that meet the rules above.
- Every slice can be reverted without breaking the one before it.
- There is no final integration slice.
- Cross-cutting concerns are either needed by the slice they sit in or deferred to a named later slice.

Fix what you can. If a fix needs information from the user, keep the slice and add a `**Caveat.**` line saying what is unresolved.

## 6. Present the plan

```text
## Plan: <short title>

**Outcome.** A <role> can <action> and see <result>.
**Non-goals.** <out of scope>
**Key risks / unknowns.** <2 to 4 bullets>

### Slice 0: Walking skeleton — <outcome>
...
### Slice N: <outcome>
...

### Open questions
- <anything whose answer would change the plan>
```

Then ask whether to save it to a file (`./plan.md` or `./docs/plans/<slug>.md`), keep iterating, or start Slice 0. Leave it in chat unless the user asked for a file.
