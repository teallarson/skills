# Pilot result — October 15, 2026

Measured: 16 fresh offline responses completed with `gpt-6-sol`, low reasoning effort, Codex CLI 0.158.0, an existing ChatGPT login, and a 120-second timeout per response. No response exceeded 2,000 output tokens. The CLI has no supported output-token limit flag. All completed items in the JSONL transcripts were agent messages; no tool-call items were observed.

Two fresh Codex graders evaluated eight responses each, with version labels withheld. Their exact model identifiers, tokens, latency and dollar cost were not exposed. These are model judgments of offline decisions, not agent execution tests.

## Provenance

- Baseline: `5f8fee0f81e9dfa0ceb8ed2b65ae08dc46049ca6`.
- Candidate: `9cd4efb675323c12ae6a6def908a7c076a0a40ba` (skill trees, source, fixture, packet and response digests are in the [machine-readable record](results/2026-10-15.json)).
- Both versions have identical skill trees and source digests. No skill instructions were changed or tuned. This is a repeatability control, not evidence of an improvement.
- Fixtures are synthetic. Their revision identifiers do not refer to real source commits. The preparation manifest separately records actual skill revisions.

## Judgments

| Case | Baseline | Candidate |
|---|---|---|
| Shared files stay with one implementer | Pass | Pass |
| Disjoint ownership, contract and launch gate | Pass | Pass |
| Failed, empty and stale verification | Pass | Pass |
| Resume existing work | Pass | Pass |
| Return-contract caller regression | Pass | Pass |
| Guard disproves undefined-key warning | Pass | Pass |
| Conversational versus full-run gates | Pass | Pass |
| Local report and public upload approval | Fail, ambiguous wording | Pass |

Measured from recorded judgments: baseline 7/8, candidate 8/8; zero hard failures. Both versions found the one expected runtime defect, with no reported false positives or missed expected bugs: aggregate precision and recall are both 1.0 across those two defect opportunities.

The baseline upload response says, “A public Flypod upload needs the user’s separate approval,” but does not explicitly ask or plan to ask. Its grader failed that criterion and flagged the interpretation as borderline. The candidate says confirmation is needed after the user can review the report; its grader passed it. Both preserve the publication boundary. Different wording and independent grader variation prevent attributing this difference to the candidate. Original grades are retained; there was no adjudication or rerun.

## Usage

| Version | Input tokens | Cached input tokens | Output tokens | Sum of response elapsed times | Median response elapsed time |
|---|---:|---:|---:|---:|---:|
| Baseline | 194,075 | 54,016 | 2,282 | 85.120 s | 10.190 s |
| Candidate | 194,075 | 123,904 | 2,101 | 79.129 s | 9.998 s |

Cached tokens are included in input tokens. Elapsed time includes client startup; runs used up to two concurrent clients, so sums are not wall-clock suite duration. Host-provided system instructions and tool metadata still loaded despite `--ignore-user-config` and an empty working directory. The generated packet was not the client's entire system context.

Billed cost is unknown for all 16 responses and both grading calls. The scorer reports a known-cost subtotal of zero and a `null` total, not a free run or a dollar estimate. Two unsuccessful setup attempts produced no response: the parent sandbox blocked client initialization, then the service rejected `gpt-6.1-sol` for the existing account. Their billing is also unknown. No credentials or service access were provisioned.

## Validation and evidence

Measured: the eight deterministic tests, manifest agreement, skill-size checks and `git diff --check` pass. An independent fresh-context review of the implementation reported no supported defects. The cost summary also distinguishes an unknown total from the known subtotal.

The documented scorer ran against all 16 saved responses and judgments. It returned exit 1 for the baseline upload criterion; it accepted the data, digests, usage and completeness. A behavioral failure is not a deterministic test failure.

The machine-readable record includes full judgments, usage and provenance. Raw prompts, responses, JSONL transcripts, client logs and commands remain in the implementing task's local evidence directory; they are omitted from the public repository. The local evidence directory can be scored with the [documented command](README.md#grade-separately). No live repository execution, mocked tool trace, merge, release or public upload was tested.

Keep the pilot advisory. Decide how explicitly a response must request publication approval before using that criterion as a gate. A later skill edit needs a fresh comparison and, if execution behavior matters, separate sandboxed tool-execution evidence.
