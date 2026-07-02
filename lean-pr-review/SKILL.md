---
name: lean-pr-review
description: >-
  Walk through a pull request iteratively until every change is understood and
  justified. Challenge unnecessary complexity, overengineering, anti-patterns,
  tests that don't earn their keep, and runtime bugs (races, empty states,
  contract mismatches, regressions). Conversational, one slice at a time.
  Ends with a polished standalone HTML review for flypod.dev. Use when the user
  asks for a lean PR review, conversational PR walkthrough, or wants to
  understand every change in a PR before merging.
disable-model-invocation: true
---

# Lean PR Review

Understand every change. Challenge everything that doesn't earn its keep. **Hunt bugs, not just design.** Ship a polished HTML artifact when done.

This skill is the opposite of batch/automated review. It is **sequential, conversational, and gate-driven**. Do not dump findings. Do not skip ahead. Do not generate the HTML until the user explicitly says the review is complete.

## Core posture

Batch `code-review` skills ask: *"What's wrong?"*

This skill asks two things every slice:

1. *"Why does this exist, and could it be simpler?"* (earn your keep)
2. *"What breaks if I use this as shipped?"* (bugs)

Design nits and runtime bugs are different animals — **do not fold bugs into ⚠️ nits** or defer them to "user asked at the end."

## When to use

- User invokes `/lean-pr-review` or asks for a conversational PR walkthrough
- User wants to understand every change before merging
- User wants a flypod.dev-ready HTML review at the end

## Phase 0 — Scope lock

Gather before reading any code:

1. PR URL, branch name, or explicit diff scope
2. Base branch (default: `origin/main`)
3. What "done" means for this session: ship verdict, understanding only, or both

Run in parallel:

```bash
gh pr view --json title,body,number,url,files,commits,headRefOid,baseRefName
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
- Note **integration paths** to trace at synthesis (e.g. env → API → UI → request)

**Present the map. Wait for the user to confirm order or reprioritize.**

## Phase 2 — Intent check

Before the walkthrough, answer:

1. What does the PR *claim* to do? (title + body)
2. What does the diff *actually* do?
3. Do they match?
4. Any scope creep, drive-by refactors, or missing pieces?
5. **What are the riskiest runtime paths?** (loading races, config edge cases, trust boundaries) — list 2–4 to verify in Phase 3

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

### 3c. Bug pass

Apply [reference/bugs.md](reference/bugs.md). **Mandatory every slice.**

For this slice, trace at minimum:
- Happy path
- Empty / zero / unset config
- Loading or in-flight (if async)
- Stale persisted state vs fresh server data (if stateful)
- What regresses vs `main`?

Read call sites outside the diff when this slice changes a contract. Record **Bug**, **Likely bug**, **Footgun**, or **Not a bug**.

### 3d. Slice verdict

End each slice with a running tally:

| Status | Meaning |
|--------|---------|
| ✅ | Understood, earns its keep |
| ⚠️ | Question or nit — not blocking |
| 🐛 | Bug or likely bug — needs fix or explicit acceptance |
| 🦶 | Footgun — misconfig / edge deploy; document or guard |
| 🔴 | Concern — needs change or discussion |

```
Slice 2 — Auth middleware
  ✅ jwt validation logic
  ⚠️ new helper could live inline
  🐛 persisted token sent before allowlist loads — first message wrong model
  🦶 empty CHAT_MODELS → DEFAULT id "" — stream with model: ""
```

**Stop after each slice.** Ask: *"Ready for the next slice, or dig deeper here?"*

Do not advance until the user says go.

### Conversational rules

- One slice at a time — never dump 15 findings at once
- Explain before judging
- If a question can be answered by reading the codebase, read it
- When the user pushes back, engage — this is a conversation, not a verdict machine
- Keep a running notes buffer (markdown) throughout; this becomes the HTML content
- **Proactively surface bugs** — don't wait for the user to ask "anything buggy?"

## Phase 4 — Synthesis

When all slices are walked:

1. **Cross-slice bug trace** — end-to-end path from Phase 1; config → server → client → UI → request → handler
2. **Bug summary** (required):
   - Ship-blocking
   - Should fix
   - Footguns / accepted
   - Checked, not bugs (brief)
3. Recap open questions — resolve any remaining
4. Verdict: **ship** / **ship with nits** / **needs changes** (any confirmed ship-blocking 🐛 → needs changes)
5. List anything still not understood (should be empty)
6. Positive highlights — what was done well

**Gate:** Ask explicitly: *"Are you satisfied the review is complete?"*

Do not proceed to Phase 5 until the user confirms.

## Phase 5 — HTML artifact

Only after the gate.

**Reference example:** https://9b04968f857642fd.flypod.dev/ — match this structure and tone.

1. Read [reference/report.html](reference/report.html) as the structural skeleton
2. Read [reference/tone.md](reference/tone.md) for voice, severity chips, and finding format
3. Fill the template with session content:
   - **Masthead:** kicker (area · Code Review), title, meta row (PR, ticket, author, +/-, files, package)
   - **Verdict badge:** "Ship" / "A few asks" / "Needs changes" + lead sentence
   - **The one thing to weigh:** single narrative on the central tension
   - **Findings at a glance:** table with anchor links (#f1, #f2…) — **bugs ordered first**
   - **The findings:** numbered cards with `where`, `<dl>` sections, and **Ask** callouts
   - **What's solid:** closing paragraph with blocking clarity
   - **Footer:** repo#PR, commit SHA, finding counts by severity
4. Write to a local path (e.g. `pr-review-<number>.html`)
5. Run `/impeccable polish` on the HTML — single self-contained file, no external deps
6. Tell the user the file path; ready to upload to [flypod.dev](https://flypod.dev)

Order findings by importance: **bugs first**, then footguns, then design nits. Be conversational — see tone reference.

## Running notes format

Maintain this buffer during Phase 3–4 (not shown to user unless asked):

```markdown
# PR #123 — [title]

## Intent
[phase 2 summary]

## Risk paths to verify
- ...

## Slices

### Slice 1 — [name]
**What it does:** ...
**Earn your keep:**
- ✅ ...
- ⚠️ ...
**Bugs:**
- 🐛 ...
- 🦶 ...
- ✅ not a bug: ...

### Slice 2 — ...

## Synthesis
**Bugs:** ship-blocking / should fix / footguns / not bugs
**Verdict:** ...
**Highlights:** ...
```

## Anti-patterns for the reviewer (agent)

- Dumping a full review without walking slice by slice
- Skipping the intent check
- **Design-only review** — earn-your-keep without the bug pass
- **Deferring bugs to synthesis or until the user asks**
- Treating plausible runtime failures as ⚠️ when they belong under 🐛 or 🦶
- Generating HTML before the user confirms completion
- Vague findings ("could be simpler") without citing what and why
- Approving tests that only assert mocks or implementation details
- Missing drive-by changes buried in unrelated slices

## Integration

- **Earn-your-keep lenses:** [reference/lenses.md](reference/lenses.md)
- **Bug hunt playbook:** [reference/bugs.md](reference/bugs.md)
- **HTML skeleton:** [reference/report.html](reference/report.html)
- **Tone & voice:** [reference/tone.md](reference/tone.md)
- **Example output:** https://9b04968f857642fd.flypod.dev/
- **Final polish (optional):** `/impeccable polish <path-to-html>` if you have the impeccable skill
- **Do not invoke** batch `code-review` skills in parallel — different mode, different goal
