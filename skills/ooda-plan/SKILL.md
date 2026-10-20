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

For staged plans, make each slice end-to-end, user-observable behavior through every layer it touches, with an Observe, Orient, Decide, Act loop and acceptance criteria checked before the next slice starts. To restructure an existing plan, use [slice-plan](../slice-plan/SKILL.md).

Scale the plan to uncertainty and risk. For a small coherent change, even across files or visible behavior, state the change and scope/non-goals once, then observable acceptance criteria and verification. Omit repeated task summaries, OODA headings, and the full workflow below; include only risks or unknowns that could change the work. Use the full workflow when staged learning or integration risk warrants it. Skip a written plan for straightforward work unless requested.

## 1. State the outcome

Confirm three things. Ask only for what is missing; if the request already covers all three, restate them so the user can correct you.

- **Who** uses the change: end user, internal dev, ops, or an automated caller.
- **Done**, in one sentence: "A <role> can <action> and see <result>."
- **Constraints**: deadlines, systems that can't change, non-goals, known unknowns.

Separate required behavior and safety constraints from optional implementation suggestions. Check the simplest existing tool, CLI, or workflow against the acceptance criteria first; justify custom infrastructure or an abstraction with a concrete unmet requirement. Stopping safely with manual recovery can meet the need; do not assume automatic retry or resume is required.

## 2. Address integration risk early

When the change introduces or alters integration boundaries, start with the thinnest end-to-end path that tests those boundaries. Label it `Slice 0: Walking skeleton`. It may use fixed data, but must preserve required safety behavior. Run it in the real gateway, client, or service that exercises the risk; mocks alone cannot establish that integration works.

Recheck live behavior when later slices change those boundaries or invalidate earlier evidence. For a local change with established integration, use focused checks and one final behavior check as needed; do not invent a skeleton or repeated live checks. If live verification is unavailable, record the gap and the next check instead of claiming it passed.

If the first outcome is unclear, narrow or split it before planning the rest. Design only enough to run that first check.

## 3. Add the remaining slices

Each slice:

- Is named by what the user can newly do or see ("User archives a note"), not by a layer or file ("Add archive endpoint").
- Can ship and be reverted on its own. Reverting slice N leaves slice N-1 working.
- Touches every layer that increment needs. No UI-only or DB-only slices, and no final "wire it all up" slice.
- Leaves auth, validation, error paths, observability, performance, and polish to later slices of their own, unless the current slice can't work without them.

Use only the slices needed for coherent outcomes and useful checkpoints. One slice is enough when further splitting adds coordination without reducing risk.

## 4. Write each slice in this template

For a filled-in slice, read [reference/archive-notes-example.md](reference/archive-notes-example.md).

```text
### Slice N: <user-observable outcome>

**Observe.** What is true now in the code, tests, or prior slice's output. Name the files to open, commands to run, and signals to check.

**Orient.** What the prior slice revealed, which assumptions to check now, risks, open questions. For Slice 0, orient against the existing codebase.

**Decide.** The smallest change that delivers the outcome. Say what is in scope and what is deferred. Stubs may simplify unrelated dependencies, but must not replace the integration being verified.

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
- When the deliverable is itself a check (a lint, test, validator, or type), the criterion is a planted mistake that fails it with a message naming the problem.

## 5. Check the plan

Before presenting, confirm:

- Every slice is named by outcome.
- New or changed integration boundaries are checked early in the real environment; later checks follow the risks they change.
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
