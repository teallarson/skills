# Results and provenance

The runs below are debugging evidence, not proof that the skills improved or that an agent executes them correctly. Full reports remain in immutable Git history; generated JSON is excluded from the current plugin tree.

| Study | Skill revisions | Recorded grades | Interpretation |
|---|---|---|---|
| Repeatability control | `5f8fee0` → `9cd4efb` | 7/8 → 8/8 | Skill text was identical. Sampling and grader variation explain the difference; it is not an improvement result. |
| After PRs #8/#9 | `5f8fee0` → `dc6740a` | 6/8 → 7/8 | Real skill changes from main `de414df`, but one response per case and interpretive grading cannot establish an improvement. |

Both studies used 16 fresh offline responses from `gpt-6-sol`, low reasoning effort, Codex CLI 0.158.0 and a 120-second per-response limit. Responses stayed below 2,000 output tokens and no tool calls were observed; host system/tool context still loaded.

## What was learned

Both versions caught the planted caller defect and respected scoped publication permission. The candidate omitted branch/worktree names and proposed a server-only first slice followed by UI work; the old rubric missed that larger planning error.

Baseline failures included omitted public-visibility disclosure and an ambiguous implication that an unlisted non-string test had run. Two graders retained the latter hard-failure flag under one reading, but the response denied personal execution; that is not conclusive evidence of fabricated command execution.

The revised planning fixture no longer prescribes API/UI layers and grades the first browser-to-server download before parallel enhancements. The verification fixture now lists all executed tests, and ambiguous judgments must be clarified before scoring. These revisions have not been model-tested; historical grades are unchanged.

## Immutable archives

- [First study: full provenance, judgments and usage](https://github.com/teallarson/skills/blob/0f0aea68806a971a08503a955a4c111921e2fad7/evals/results/2026-10-15.json). Use harness/cases/rubric at `f104e5051823e9d948e93f2b127e120af863644d` for historical validation.
- [Changed-skills study: full provenance, judgments, adjudication and usage](https://github.com/teallarson/skills/blob/0f0aea68806a971a08503a955a4c111921e2fad7/evals/results/2026-10-15-merged-main.json). Use harness/cases/rubric at `0f0aea68806a971a08503a955a4c111921e2fad7` for historical validation.

The archives contain full commit IDs, source/fixture/packet/response hashes and grader evidence. Raw prompts, responses and client logs were retained separately in the implementing task's local evidence directories; they were never committed.

| Study | Input / output tokens | Grading calls | Billing |
|---|---:|---:|---|
| Repeatability control | 388,150 / 4,383 | 2 | Unknown |
| Changed skills | 406,532 / 4,336 | 2 plus 1 adjudication | Unknown |

Exact grader model, token and cost metadata was unavailable. Fixtures and grading changed between studies, so their totals must not be compared as a single before/after experiment.
