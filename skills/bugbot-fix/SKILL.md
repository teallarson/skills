---
name: bugbot-fix
description: Request a Cursor BugBot review on the current PR, triage each finding, apply worthy fixes, dismiss false positives with explanations, then re-request. Repeats up to 3 rounds. Escalates to the user if bugs persist after max rounds.
---

# BugBot Fix

Automate the Cursor BugBot review loop: request a review, wait for findings, fix what's real, dismiss what's not, and re-request — up to 3 rounds. Escalate to the human if bugs are still accumulating after that.

## When to Use

- After pushing a PR and wanting automated bug-finding before a human review
- When you want to quickly close out Cursor BugBot findings without manual triage
- When the user types `/bugbot-fix` or says "run bugbot" / "fix bugbot findings"

## Prerequisites

- Must be on a branch with an open PR (`gh pr view` should succeed)
- Cursor BugBot must be installed on the repo (the `cursor[bot]` GitHub App)

---

## Workflow

### Step 0: Identify the PR

```bash
gh pr view --json number,title,headRefName,state
```

If no open PR exists, stop and tell the user:

> No open PR found for the current branch. Create one first, then re-run `/bugbot-fix`.

Record the PR number. All subsequent `gh` calls use this number.

### Step 1: Check for Existing BugBot Comments

Before requesting a new review, check whether BugBot has already left unaddressed findings from a previous run:

```bash
gh api repos/{owner}/{repo}/issues/{number}/comments \
  --jq '[.[] | select(.user.login | test("cursor"; "i"))] | sort_by(.created_at)'
```

Also check review comments on the diff:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '[.[] | select(.user.login | test("cursor"; "i"))] | sort_by(.created_at)'
```

If there are existing unresolved BugBot comments, go directly to Step 3 (Triage) using those findings instead of requesting a fresh review. Otherwise continue to Step 2.

### Step 2: Request a BugBot Review

Post a comment on the PR to trigger the review:

```bash
gh pr comment {number} --body "@cursor review"
```

Then poll for BugBot's response. Check every 30 seconds, up to 10 minutes:

```bash
# Poll loop — run this repeatedly until a new cursor[bot] comment appears
gh api repos/{owner}/{repo}/issues/{number}/comments \
  --jq '[.[] | select(.user.login | test("cursor"; "i"))] | last'
```

Track the timestamp of the `@cursor review` comment so you can detect **new** BugBot responses (created after that timestamp).

If no response appears within 10 minutes, stop and tell the user:

> BugBot did not respond within 10 minutes. It may not be installed on this repo, or the review may be queued. Check the PR on GitHub and re-run once BugBot has commented.

### Step 3: Parse BugBot Findings

BugBot's comment typically lists findings in a structured format — a list of bugs, potential issues, or suggestions. Parse the comment body to extract individual findings.

Each finding should capture:

- **Title / short description** (one line)
- **File and line reference** (if provided)
- **Full text** of the finding

If BugBot found nothing, it usually says something like "No issues found" or "Looks good." If the findings list is empty or all-clear:

> BugBot found no issues. Round complete — no changes needed.

Stop the loop.

### Step 4: Triage Each Finding

For each finding, apply the following judgment criteria.

**Fix it if:**

- It's an objective bug — code that will produce incorrect behavior at runtime (null deref, wrong logic, missed error, data corruption)
- It's a security issue — input not validated, auth bypass, injection risk
- It's a clear API misuse — calling a function wrong, wrong argument order, mishandled promise

**Dismiss it if:**

- It's a style suggestion or code preference not backed by a rule
- It flags code that is intentional by design (e.g., an empty catch block that's a deliberate no-op, a short-circuit that's correct)
- It repeats a finding that was already dismissed in a prior round of this session
- It's about test coverage, documentation, or TODOs (unless explicitly a bug in an existing test)
- The suggestion would require understanding of broader context BugBot doesn't have (e.g., "this could be null" but it provably can't be due to upstream invariants)

**When uncertain:** lean toward dismissal with a brief explanation. BugBot findings are a starting signal, not a mandate.

### Step 5: Apply Fixes

For each finding marked **fix**:

1. Read the relevant file and understand the context
2. Implement the minimal fix (don't refactor surrounding code)
3. Run the linter after all fixes are applied: `bun x biome check --write` (for TS/JS) or `make check` in the relevant service directory

If a fix is non-trivial (requires architectural understanding, touches multiple systems, or you're not confident), mark it as **needs human review** instead of attempting it. Add it to the escalation list.

### Step 6: Respond to Dismissed Findings

For each finding marked **dismiss**, post a reply on the PR explaining why:

```bash
gh pr comment {number} --body "$(cat <<'EOF'
**BugBot finding: <short title>**

Dismissed — <one-sentence reason>. <Optional: what the code actually does and why it's correct.>
EOF
)"
```

Keep dismissal comments short and factual. No need to be defensive — just state the reason clearly.

### Step 7: Commit and Push Fixes

If any fixes were applied:

```bash
git add -p   # stage only the fix hunks (or specific files)
git commit -m "fix: address BugBot findings (round N)"
git push
```

Use `N` as the current round number (1, 2, or 3).

### Step 8: Check Round Limit

Increment the round counter. If this was round 3, go to **Step 9 (Escalate)**.

Otherwise, go back to **Step 2** to request the next review.

### Step 9: Escalate to Human

After 3 rounds, if BugBot is still finding actionable bugs, stop and surface a summary for the user:

```text
BugBot loop hit the 3-round limit. Still-open findings that need your input:

1. <finding title> — <file:line> — <reason it wasn't auto-fixed>
2. ...

These may require design judgment, broader context, or architectural changes.
Recommend reviewing each finding on the PR before merging.
```

Do not request another BugBot review. Leave it for the human to resolve.

---

## Output at Each Round

After each round, summarize what happened:

```text
Round N complete.

Fixed (M):
- <title> in <file>

Dismissed (K):
- <title> — <reason>

Needs human input (J):
- <title> — <reason>

<Next: requesting round N+1 review.>
  OR
<Done: no more actionable findings.>
```

---

## Limits and Safety

- **Max rounds:** 3. After that, always escalate.
- **Never fix something uncertain:** when in doubt, dismiss with an explanation or add to the escalation list.
- **Never force-push.** Always create new commits for fixes.
- **One commit per round** — group all fixes from a round into a single commit.
- **Don't re-dismiss the same finding twice.** If BugBot keeps raising the same issue across rounds, add it to the escalation list with a note that it was dismissed in a prior round and BugBot re-raised it.
