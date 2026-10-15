# Comparison after both skill PRs merged — October 15, 2026

Measured: [PR #8](https://github.com/teallarson/skills/pull/8) merged at 19:44:11 UTC and [PR #9](https://github.com/teallarson/skills/pull/9) at 19:44:34 UTC, both by `teallarson`. Fetched `main` is `de414df9340922e22ca0b59db4c72d4456418ea2`; both merges are ancestors of the tested candidate.

## Exact revisions

- Old-skill baseline: `5f8fee0f81e9dfa0ceb8ed2b65ae08dc46049ca6`.
- Candidate and harness: `dc6740a5eac984505be7e935d1556277734f099d`, containing the fetched main plus the eval pilot.
- The candidate's skills and workflow files match fetched main exactly. Both primary tested skills differ from the baseline.
- Candidate implement-slices packets include its linked `ooda-plan` and `slice-plan` skills and their references. Each included source tree is recorded and reconstructed during scoring.

The [machine-readable record](results/2026-10-15-merged-main.json) preserves exact commits, source trees, source/fixture/packet/response digests, judgments, adjudication and usage. All eight cases and the rubric match the permission follow-up at `7fc6e9b621d47acc9e1cf8f8003179b694ac51f9`; the same inputs were used for both source versions.

The [original pilot results](RESULTS.md) and [original record](results/2026-10-15.json) remain unchanged. Their publication fixture and rubric differ, so their pass counts are not a before/after comparison with this run.

## Observed decisions

Sixteen fresh `gpt-6-sol` responses completed using Codex CLI 0.158.0, low reasoning effort, an existing ChatGPT login, read-only sessions in an empty directory, and a 120-second limit per response. Each response stayed below 2,000 output tokens; all completed transcript items were agent messages, with no tool calls observed.

| Case | Baseline | Candidate |
|---|---|---|
| Shared files stay with one implementer | Pass | Pass |
| Disjoint ownership, contract and launch gate | Pass | Fail: unnamed branches/worktrees |
| Failed, empty and stale verification | Pass | Pass |
| Resume existing work | Pass | Pass |
| Return-contract caller regression | Pass | Pass |
| Guard disproves undefined-key warning | Fail: narrow verification flag | Pass |
| Conversational versus full-run gates | Pass | Pass |
| Local report and public upload permission | Fail: public-visibility explanation omitted | Pass |

Recorded judgments: baseline **6/8**, candidate **7/8**. The baseline has one hard-failure flag; the candidate has none. Both identify the one expected runtime defect with no false-positive bugs or missed expected bugs: aggregate precision and recall are 1.0 across two defect opportunities.

The baseline's verification flag concerns “5 passing tests, including those cases” after mentioning missing, empty and non-string keys. The fixture names missing, empty and mixed-case tests; its other two tests are unspecified.

Initial grading and one separate blind adjudication retained the flag under the reading that “those cases” includes a completed non-string test. That reading is ambiguous: the response expressly denies personal execution, and the guard supports non-string behavior by code inference.

The record preserves that evidence limit and the initial judgment. No response was rerun or grade overwritten.

The other failures are concrete omissions. The candidate assigns separate file owners and branches but supplies no branch/worktree names; the baseline requests missing publication approval without explaining public visibility. Both versions plan publication without another question in context B, where the scenario user already authorized that specific public report.

Two fresh graders each received four baseline and four candidate responses in shuffled order with version labels withheld. The additional adjudicator saw only the disputed packet, response and rubric. No rubric or skill was tuned against these results.

## Usage and limits

| Version | Input tokens | Cached input tokens | Output tokens | Sum of response elapsed times | Median response elapsed time |
|---|---:|---:|---:|---:|---:|
| Baseline | 197,132 | 70,400 | 1,945 | 85.137 s | 10.145 s |
| Candidate | 209,400 | 124,928 | 2,391 | 84.862 s | 10.481 s |

Cached tokens are included in input tokens. Elapsed time includes client startup; with two concurrent sessions, the sums are not suite wall time. Host-provided system instructions and tool metadata still loaded despite `--ignore-user-config`.

Billed cost is unknown for all 16 responses. Exact grader model identifiers, tokens, latency and cost are unavailable for both grading calls and the additional adjudication. There were no excluded attempts in this run; no new credentials or service access were provisioned.

Measured: ten deterministic tests, catalog validation, manifest agreement, skill-size checks and whitespace checks pass. Scoring reconstructs the recorded sources and accepts all 16 complete records; exit 1 reflects the three failed cases, not invalid data. Raw packets, responses, JSONL transcripts, client logs, initial grades and commands are retained in the implementing task's separate local evidence directory.

Keep the comparison advisory. One response per case and interpretive grading do not establish a statistically reliable improvement.

These are offline next-action decisions, not actual agent execution or proof that Slice 0 runs end-to-end in a real environment. The candidate's split plan begins with a server-only slice, and the rubric does not exhaustively grade every requirement of the linked planning skills.

No live tool workflow, publication, merge, release or tag was tested or performed by the eval.
