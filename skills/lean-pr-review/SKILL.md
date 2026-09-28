---
name: lean-pr-review
description: >-
  Lean PR review: walk a pull request slice by slice until every change is
  understood before merging. Challenges needless complexity, weak tests, and
  runtime bugs. Gated by default, or a full/one-shot run with no stops. Ends
  with an HTML review for flypod.dev. Use for a lean PR review or a PR
  walkthrough.
disable-model-invocation: true
---

# Lean PR Review

For each slice of the PR, ask why each change exists, whether it could be simpler, and what breaks if it ships as is. Report bugs separately from design nits.

## Two modes

**Conversational (default).** Stop at every gate.

**Full run.** Use when the user says "full run", "one-shot", "don't stop and ask", or hands over a PR and leaves. Say `Full run — no gates until the artifact.` once, then:

| Phase | Conversational | Full run |
|---|---|---|
| 0 scope | Confirm | State inferred scope (branch vs `origin/main`) |
| 1 walk order | User picks | Dependencies first |
| 2 intent | Wait for agreement | Record it, flag mismatches |
| 3 each slice | Stop | Write the verdict, continue |
| 4 completion | Ask | Skip; unresolved items become open questions in the report |
| flypod deploy | Confirm | Confirm |

A full run skips only the gates: every slice still gets all four Phase 3 steps and the same length budgets. Don't ask "shall I continue?" between slices.

Ask which mode only if it's ambiguous and changes the work. At the conversational Phase 0 gate, offer: "Or say 'full run' and I'll take it start to finish."

In either mode, stop and ask on a blocker: no PR and no base branch, a scope spanning unrelated branches, or a diff that doesn't apply.

## Concision

In chat and in the HTML:

- State each fact once.
- Give a trace's result ("Checked X; still guarded"), not its steps, unless the result is surprising.
- Quote code, diffs, and repro commands instead of describing them.
- Name the thing: "`useEffect` copies `serverData` into form state", not "fragile state."
- Two sentences for a Minor, a short paragraph for a Major, never more.
- Pick one reading; don't hedge.
- Use lists or tables for findings, checks, and verdicts.
- Start at the claim. No preamble, and no arguing with an imagined objector.

## Phase 0 — Scope lock

Get the PR, branch, or diff; the base (default `origin/main`); and what "done" means (ship verdict, understanding, or both). Run in parallel:

```bash
gh pr view --json title,body,number,url,files,commits,headRefOid,baseRefName
git diff --stat <base>...HEAD
git log --oneline <base>...HEAD
```

With no PR, use the branch diff. **Gate:** confirm scope.

## Phase 1 — Territory map

Before reading code closely, group changed files into slices by concern (feature, fix, refactor, config, tests for X), not directory. Per slice: files and why each belongs, file count, lines added/removed. Flag files that fit no slice. Propose a walk order, dependencies first. Note end-to-end paths to trace in Phase 4 (env → API → UI → request).

**Gate:** user confirms the order.

## Phase 2 — Intent check

Compare what the PR claims with what the diff does; flag mismatches, scope creep, drive-by refactors, and missing pieces. List the 2–4 riskiest runtime paths (loading races, config edge cases, trust boundaries) to check in Phase 3.

**Gate:** user agrees with the summary.

Keep notes from here on in the format in [reference/notes.md](reference/notes.md).

## Phase 3 — Slice walkthrough

One slice at a time. Look things up in the code instead of asking the user. When the user pushes back, answer from the code.

**3a. Explain** what problem the slice solves, what each file does, and how they connect.

**3b. Design pass.** Apply [reference/lenses.md](reference/lenses.md), citing file:line. On every slice, backend included, check:

- **Synced vs. derived state:** a second copy of a fact kept in agreement by hand. If it's computable from the source of truth, the copy goes.
- **Overengineering:** code for a requirement nobody has. Ask what breaks if it's deleted and added back when needed. Don't flag it if it has a named current consumer or prevents a real failure.

On React/TypeScript slices, also apply [reference/frontend-idioms.md](reference/frontend-idioms.md), tagging findings 🧹. If one also causes a runtime defect, raise that as 🐛 and cross-link.

**Nit bar (⚠️, 🧹):** the author would plausibly change it, and something goes wrong if it ships. At most two nits per slice. Bugs and footguns have no cap.

**3c. Bug pass, every slice.** Apply [reference/bugs.md](reference/bugs.md). Trace at least: happy path; empty or unset config; loading or in-flight; stale persisted state vs fresh server data; regressions vs `main`. When a contract changes, read call sites outside the diff. Raise bugs in the slice where you find them, never as ⚠️.

**3d. Slice verdict,** one line per item:

- ✅ understood and needed
- ⚠️ question or nit that clears the bar; not blocking
- 🐛 bug or likely bug; fix or explicitly accept
- 🦶 footgun: fails on misconfig or an unusual deploy; document or guard
- 🔴 concern; needs a change or discussion

**Gate:** "Ready for the next slice, or dig deeper here?"

## Phase 4 — Synthesis

1. Trace the Phase 1 end-to-end paths.
2. Bug summary: ship-blocking, should fix, footguns or accepted, checked and not bugs.
3. Resolve open questions; list anything still not understood (should be none).
4. Verdict: ship, ship with nits, or needs changes. Any confirmed ship-blocking 🐛 means needs changes.
5. What was done well.

**Gate:** "Are you satisfied the review is complete?"

## Phase 4.5 — Red-pen pass

Go over every finding only to cut; don't add findings or soften wording. Cut findings that describe code without saying what's wrong, or fail the nit bar or cap. Merge findings with one root cause. Cut any over its Phase 5 budget down to the verdict. If one hedges, keep the reading you believe.

List the cuts on one "Considered and dropped" line. If you find a missed bug, say so and redo that slice's Phase 3. Optionally hand the findings to a fresh subagent whose only instruction is this pass.

## Phase 5 — HTML artifact

Render only what survived Phase 4.5. First read [reference/artifact.md](reference/artifact.md) (sections, length budgets, deploy), [reference/report.html](reference/report.html), and [reference/tone.md](reference/tone.md). Order findings bugs, footguns, then nits.

Deploy to flypod only after the user confirms, in either mode: it publishes the review, including internal paths and code, at a public URL anyone can open.
