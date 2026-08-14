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

## Be concise — this is a hard requirement

The deliverable is a review a busy engineer reads in one sitting, not a document that proves you were thorough. Thoroughness belongs in the *investigation*; the *artifact* reports only what survives it.

**The default failure mode of this skill is verbosity.** You will want to show the reasoning that convinced you. Don't. State the conclusion and the one fact that supports it. A reviewer who wants the derivation will ask.

Rules that apply everywhere — conversation and HTML alike:

- **One fact, once.** If it's in the readout, it isn't repeated in the finding. If it's in the finding, it isn't repeated in "what's solid."
- **Cut the trace, keep the verdict.** "I traced X through Y and Z, and here is each step" becomes "Checked X; still guarded." Show a trace only where the conclusion is surprising.
- **No throat-clearing.** Drop "It's worth noting," "I want to be clear," "Having traced it," "That said." Start at the claim.
- **Length scales with severity.** A Minor gets two sentences. A Major gets a short paragraph. Nothing gets three paragraphs.
- **Don't hedge in both directions.** Pick the read you believe and say it. "Defensible, but concerning, but ultimately fine" is noise.
- **Prefer a table or list to prose** whenever the content is enumerable.

If a passage reads like it's arguing with an imagined objector, delete the argument.

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

On frontend (React/TypeScript) slices, also run the **Framework idioms** lens — the
derive-don't-sync, redundant-state, sentinel-input, over-memo, and TS-faux-pas smells a
passing build hides. Playbook: [reference/frontend-idioms.md](reference/frontend-idioms.md).
Tag these `🧹`, but raise any that also cause a runtime defect (e.g. a `form.reset` effect
that clobbers edits) as 🐛 and cross-link them.

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

### Length budgets — check these before you hand it over

The whole document should be **under ~800 words of body copy** and readable in about three minutes. Count them if unsure. Per section:

| Section | Budget |
|---|---|
| Verdict lead | 2 sentences |
| The one thing to weigh | **one** paragraph, ≤ 120 words |
| Each finding: `What` | ≤ 60 words |
| Each finding: extra `<dl>` section | at most one, and only for Major/Bug |
| Each finding: `Ask` | ≤ 40 words, one question |
| Checked, not findings | one line each, ≤ 5 items |
| What's solid | one paragraph, ≤ 80 words |

If you're over, the fix is almost never trimming adjectives. It's deleting a whole section that restates something the reader already has.

### Deploying to flypod

No auth, no account, no token. Stage the file as `index.html` in its own folder so it serves at the root, then:

```bash
npx -y flypod .          # first deploy — prints the live URL
npx -y flypod update     # ship a revision to the same URL
```

Sites expire in 14 days. **Confirm with the user before deploying** — it publishes the review, including internal paths and code detail, at a public anonymous URL.

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
- **Writing long to look rigorous** — the investigation is thorough, the artifact is short
- **Narrating the trace** instead of reporting its verdict
- **Restating a finding** in the readout, the table, the card, and the closing paragraph
- **Three-paragraph findings** — if it needs that much, it's two findings or one bad one

## Integration

- **Earn-your-keep lenses:** [reference/lenses.md](reference/lenses.md)
- **Bug hunt playbook:** [reference/bugs.md](reference/bugs.md)
- **Frontend idiom & framework-smell playbook:** [reference/frontend-idioms.md](reference/frontend-idioms.md)
- **HTML skeleton:** [reference/report.html](reference/report.html)
- **Tone & voice:** [reference/tone.md](reference/tone.md)
- **Example output:** https://9b04968f857642fd.flypod.dev/
- **Final polish (optional):** `/impeccable polish <path-to-html>` if you have the impeccable skill
- **Do not invoke** batch `code-review` skills in parallel — different mode, different goal
