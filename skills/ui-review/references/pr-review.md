# Review UI changes

This is a scoped PR evidence lens, not a replacement for either source skill or an invocation of Impeccable critique. Apply it to UI concerns; load full Lean PR Review only when requested.

## Start with the change

Read the PR intent and current CI results, lock head/base, and identify the changed user behavior. Reuse failures CI already explains rather than rediscovering them. Read current repository rules and existing verification tools. Retrospectives and planned test tiers are evidence, not current policy.

Inspect the production components, design-system primitives/tokens, and library APIs before recommending new CSS, duplicate state, wrappers, or custom logic. Prefer the existing abstraction when it covers the actual need. Do not propose broad cleanup or a new harness to prove a small issue.

## Prove the claim

For a suspected regression, compare head and base under the same relevant conditions. Label it **introduced**, **pre-existing**, **newly exposed**, or **baseline unverified**. If unchanged code becomes reachable through this PR, explain that causal link. Keep pre-existing issues in separate follow-ups unless they block the changed behavior; do not call them regressions.

A reproduction records the revision, persona/permissions, route, steps, expected/observed result, and relevant browser, origin, API/data, and configuration. Capture console/request evidence when it explains the failure. Prefer the existing real-stack/browser harness for integration claims; mocked data can establish client-state behavior, not real persistence or browser-enforced policy. HTTP-client success is not proof of browser success.

Check whether the repro represents the deployed path: HTTP versus HTTPS, redirect hosts, feature flags, auth roles, enabled policy, and real versus stubbed services may change the conclusion. State what was actually reproduced and what remains unproven. A local failure is not automatically a production blocker. Source tracing can support a finding when execution is unavailable, but label it as static evidence rather than a successful reproduction.

Choose the few behavior checks the diff puts at risk, rather than running a fixed suite on every view. Useful cases include:

- Clear a numeric/required field; correct invalid input; ensure validation recovers without NaN or stale errors.
- Save then reload; compare dialog text, request payload, persisted value, and feedback. For partial failure, preserve unsaved work and retry only what failed.
- Use the relevant limited-permission persona; controls and side effects reflect what they can actually do, with no false success or misleading removal toast.
- Delay/fail a relevant request; check transient wrong content, recovery, and independent sections.
- Use the affected narrow viewport and keyboard flow, including after a mouse click; check overlap, menu alignment, focus, and accessible names.

## Keep only useful findings

Verify candidate findings from detectors and agents yourself. For each retained issue name the concrete trigger, harm, evidence confidence, baseline status, and smallest fix. If the repro is flawed or the claim disproved, drop it; uncertainty does not become a stronger severity label.

Few useful findings beat a list of nits. There is no finding quota or cap on real blockers. Drop generic taste complaints, implementation narration, lint already covered by CI, and speculative failures without a credible path. Keep a lower-priority concern only when it has a concrete consequence or current contract mismatch, and say when nothing breaks today. Group one root cause once; a useful follow-up can be separate from a merge blocker.

Suggest a test only for a named failure, at the smallest layer that can catch it, under current repo policy. Reuse existing coverage and shared-control checks. Explain when dependencies must be real. An isolated rendering assertion, a mock request, or a screenshot does not prove interaction or persistence. No new test is a legitimate outcome when existing evidence covers the change.

For a scoped PR review, deliver a brief verdict, the prioritized retained findings, and a compact **Behavior | How it was proven** table with real/mocked/static status and gaps. Explain significant visible side changes against the PR's stated intent. Do not repeat inline findings in the summary. Put baseline issues and uncertainty in follow-ups/run limits. Required source-playbook reports still apply when those playbooks are explicitly or clearly implicitly selected; do not omit their provenance, scores, or artifacts to shorten chat.
