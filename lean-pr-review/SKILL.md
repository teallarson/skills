---
name: lean-pr-review
description: >-
  Walk through a pull request iteratively until every change is understood and
  justified. Challenge unnecessary complexity, overengineering, anti-patterns,
  and tests that don't earn their keep. Conversational, one slice at a time.
  Ends with a polished standalone HTML review for flypod.dev. Use when the user
  asks for a lean PR review, conversational PR walkthrough, or wants to
  understand every change in a PR before merging.
disable-model-invocation: true
---

# Lean PR Review

Understand every change. Challenge everything that doesn't earn its keep. Ship a polished HTML artifact when done.

This skill is the opposite of batch/automated review. It is **sequential, conversational, and gate-driven**. Do not dump findings. Do not skip ahead. Do not generate the HTML until the user explicitly says the review is complete.

## Core posture

Batch automated review asks: *"What's wrong?"*

This skill asks: *"Why does this exist, and could it be simpler?"*

## When to use

- User invokes `/lean-pr-review` or asks for a conversational PR walkthrough
- User wants to understand every change before merging
- User wants a flypod.dev-ready HTML review at the end

## Phase 0 — Scope lock

Gather before reading any code:

1. PR URL, branch name, or explicit diff scope
2. Base branch — detect from the PR, `git remote show origin`, or ask the user (do not assume `main`)
3. What "done" means for this session: ship verdict, understanding only, or both

Run in parallel:

```bash
gh pr view --json title,body,number,url,files,commits,headRefOid,baseRefName  # when a PR exists
git diff --stat <base>...HEAD
git log --oneline <base>...HEAD
```

If no PR exists, use branch diff only. State what you're reviewing.

**Stop and confirm scope with the user** before Phase 1.

## Phase 1 — Territory map

Do NOT read code line-by-line yet. Group changed files by **concern**, not directory:

```
Slice A — [concern name]
  - path/to/file.ts (why it's in this slice)
Slice B — ...
```

Rules:
- A slice is a coherent unit of intent (feature, fix, refactor, config, tests for X)
- Flag orphans: files that don't obviously belong to any slice
- Note file count, lines added/removed per slice
- Suggest a walk order (dependencies first, or user picks)

**Present the map. Wait for the user to confirm order or reprioritize.**

## Phase 2 — Intent check

Before the walkthrough, answer:

1. What does the PR *claim* to do? (title + body)
2. What does the diff *actually* do?
3. Do they match?
4. Any scope creep, drive-by refactors, or missing pieces?

Flag mismatches now — don't discover them slice 7.

**Pause.** Ask if the intent summary is right before Phase 3.

## Phase 3 — Slice walkthrough

One slice at a time. For each slice:

### 3a. Explain first

Walk through the changes in plain language:
- What problem does this slice solve?
- What does each file do in the slice?
- How do the pieces connect?

Read surrounding code when needed to explain intent — don't ask the user what you can look up.

### 3b. Earn-your-keep pass

Apply every lens in [reference/lenses.md](reference/lenses.md). Be specific: cite file and line.

### 3c. Slice verdict

End each slice with a running tally:

| Status | Meaning |
|--------|---------|
| ✅ | Understood, earns its keep |
| ⚠️ | Question or nit — not blocking |
| 🔴 | Concern — needs change or discussion |

```
Slice 2 — Auth middleware
  ✅ jwt validation logic
  ⚠️ new helper could live inline
  🔴 test mocks entire stack, doesn't assert behavior
```

**Stop after each slice.** Ask: *"Ready for the next slice, or dig deeper here?"*

Do not advance until the user says go.

### Conversational rules

- One slice at a time — never dump 15 findings at once
- Explain before judging
- If a question can be answered by reading the codebase, read it
- When the user pushes back, engage — this is a conversation, not a verdict machine
- Keep a running notes buffer (markdown) throughout; this becomes the HTML content

## Phase 4 — Synthesis

When all slices are walked:

1. Recap open questions — resolve any remaining
2. Verdict: **ship** / **ship with nits** / **needs changes**
3. List anything still not understood (should be empty)
4. Positive highlights — what was done well

**Gate:** Ask explicitly: *"Are you satisfied the review is complete?"*

Do not proceed to Phase 5 until the user confirms.

## Phase 5 — HTML artifact

Only after the gate.

1. Read [reference/report.html](reference/report.html) as the structural skeleton
2. Read [reference/tone.md](reference/tone.md) for voice, severity chips, and finding format
3. Fill the template with session content:
   - **Masthead:** kicker (area · Code Review), title, meta row (PR, ticket/issue, author, +/-, files, scope)
   - **Verdict badge:** "Ship" / "A few asks" / "Needs changes" + lead sentence
   - **The one thing to weigh:** single narrative on the central tension
   - **Findings at a glance:** table with anchor links (#f1, #f2…)
   - **The findings:** numbered cards with `where`, `<dl>` sections, and **Ask** callouts
   - **What's solid:** closing paragraph with blocking clarity
   - **Footer:** repo#PR, commit SHA, finding counts by severity
4. Write to a local path (e.g. `pr-review-<number>.html` in the repo root or `/tmp`)
5. Polish the HTML if needed — single self-contained file, no external deps
6. Tell the user the file path; ready to upload to [flypod.dev](https://flypod.dev) or open locally

**Example output:** https://9b04968f857642fd.flypod.dev/ — match this structure and tone.

Order findings by importance, not file order. Be conversational — see tone reference.

## Running notes format

Maintain this buffer during Phase 3–4 (not shown to user unless asked):

```markdown
# PR #123 — [title]

## Intent
[phase 2 summary]

## Slices

### Slice 1 — [name]
**What it does:** ...
**Findings:**
- ✅ ...
- ⚠️ ...
- 🔴 ...

### Slice 2 — ...

## Synthesis
**Verdict:** ...
**Highlights:** ...
```

## Anti-patterns for the reviewer (agent)

- Dumping a full review without walking slice by slice
- Skipping the intent check
- Generating HTML before the user confirms completion
- Vague findings ("could be simpler") without citing what and why
- Approving tests that only assert mocks or implementation details
- Missing drive-by changes buried in unrelated slices

## Integration

- **Earn-your-keep lenses:** [reference/lenses.md](reference/lenses.md)
- **HTML skeleton:** [reference/report.html](reference/report.html)
- **Tone & voice:** [reference/tone.md](reference/tone.md)
- **Example output:** https://9b04968f857642fd.flypod.dev/
- **Do not run** batch automated review in parallel — different mode, different goal
