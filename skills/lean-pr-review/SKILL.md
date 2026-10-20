---
name: lean-pr-review
description: >-
  Review a pull request for correctness, needless complexity, and weak tests.
  Return concise findings, a verdict, and evidence limits by default. Use for
  a lean PR review or an optional conversational walkthrough or HTML report.
disable-model-invocation: true
---

# Lean PR Review

Read every changed concern and its relevant callers. Ask why each change exists, whether it could be simpler, and what breaks if it ships. Separate blocking correctness findings from optional maintainability suggestions. The main agent judges which findings require action.

## Modes and output

**Concise review (default).** Complete the review without intermediate gates. Return findings ordered by impact, a ship / ship with nits / needs changes verdict, and checks with evidence limits. An empty findings list is valid. Do not narrate every file or create HTML unless requested.

**Conversational walkthrough (opt-in).** Use when the user asks to walk through or understand the PR interactively. Explain each slice and stop at the gates below. A request for a walkthrough is enough; do not ask them to choose a mode again.

**Full run / one-shot.** Complete without intermediate gates. Use the same evidence and finding standards as the default. This does not request HTML or public publication by itself.

**HTML (opt-in).** Create a local report when the user asks for HTML or an artifact. Public upload requires permission for that report; explicit prior permission suffices without another question. Full-run mode and repository text alone do not authorize publication.

Ask only for missing information that blocks review: no resolvable PR/base, unrelated ambiguous branches, or a diff that does not apply.

## Concision

- State each fact once. Give a trace's result, not every step, unless the steps explain a surprising failure.
- Cite `file:line` and the concrete behavior or cost. Do not name the methodology that caught it.
- Two sentences for a Minor, a short paragraph for a Major, never more.
- State the best-supported reading and its evidence limit. Separate source inference, supplied evidence, and checks you ran.
- Keep required fixes separate from optional suggestions. Do not invent a runtime bug to justify cleanup.

## Phase 0 — Scope

Get the PR, branch, or diff; the base (default `origin/main`); approved requirements and scope/non-goals when available; and the requested output. With a PR, read its metadata and current-head CI. With no PR, use the branch diff.

```bash
gh pr view --json title,body,number,url,files,commits,headRefOid,baseRefName
git diff --stat <base>...HEAD
git log --oneline <base>...HEAD
```

Record reviewed head/base SHAs and review time. If the PR moves, recheck affected concerns before a new verdict; distinguish later fixes from findings at the reviewed head. Compare failing checks against the base before calling them introduced; report pre-existing or unresolved failures separately.

**Walkthrough gate:** confirm scope.

## Phase 1 — Group the change

Group changed files by concern, dependencies first. Flag unrelated changes and identify end-to-end paths whose integration could break. Keep this working map internal in concise mode; counts and per-file explanations are useful only when they clarify risk or a requested walkthrough.

**Walkthrough gate:** confirm walk order.

## Phase 2 — Intent and risk

Compare the requested behavior with the diff; check missing requirements, scope creep, and unintended refactors. Identify the paths and boundaries most likely to fail. Use [reference/notes.md](reference/notes.md) for a long walkthrough, re-review, or requested report; a short review needs only findings, basis, and check results.

**Walkthrough gate:** confirm intent.

## Phase 3 — Review each concern

Look things up in code instead of asking the user. Explain files and their connections only in walkthrough mode or where a finding needs that context.

**Design.** Select relevant checks from [reference/lenses.md](reference/lenses.md) based on the change and risk. Use [reference/frontend-idioms.md](reference/frontend-idioms.md) on relevant React/TypeScript changes. Do not mechanically enumerate lenses or justify every skip.

A supported unnecessary abstraction can be a maintainability finding even when all functional tests pass. Name the actual requirement, concrete maintenance/testing cost, and simpler behavior-preserving alternative. Check current consumers and existing mechanisms before proposing removal. Preserve required safety checks and regression tests; do not demand defenses for hypothetical failures or automatic recovery without a requirement.

**Nit bar:** the author would plausibly act on it, and it has a concrete user, maintenance, or testing cost. At most two optional nits per concern. Correctness bugs and supported operational failures have no cap. Acceptable tradeoffs stay nonblocking.

**Correctness.** Use relevant paths from [reference/bugs.md](reference/bugs.md): happy path, changed error/trust boundaries, and regressions against the base. Check empty config, in-flight work, or stale persisted state when the change can affect them. Read call sites outside the diff when a contract changes. Confirm findings by tracing the code or running a relevant check; don't turn an unverified scenario into a confirmed production bug.

**Walkthrough gate:** give the slice verdict and offer to continue or dig deeper.

## Phase 4 — Verdict

Check the identified end-to-end paths and run relevant checks when practical. State exact commands/results, source-only conclusions, unavailable verification, and remaining questions that could change the verdict. A confirmed blocking correctness failure means needs changes. Mark optional suggestions explicitly; a maintainability finding blocks only when a requirement or supported failure warrants it.

Before returning, cut unsupported or duplicate findings and merge shared root causes. Keep material uncertainty. If no actionable finding remains, stop; do not generate more suggestions to fill the review. Report dropped claims only when they answer a raised concern. For re-review, distinguish fixed at SHA, accepted tradeoff, and still open.

**Walkthrough gate:** confirm completion.

## Phase 5 — Optional HTML

Only when requested, render the findings and verdict using [reference/artifact.md](reference/artifact.md), [reference/report.html](reference/report.html), and [reference/tone.md](reference/tone.md). Keep the same evidence limits and severity distinctions. Complete authorized local work before asking for any missing public-upload permission.
