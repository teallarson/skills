---
name: ui-review
description: Review or refine existing UI using Refactoring UI and Impeccable together. Use for UI changes in a PR, design critique, technical UI audit, or requested polish. Prioritize demonstrated behavior and useful fixes. Lean PR Review is optional; backend-only reviews are outside scope.
---

# UI Review

Refactoring UI supplies design-system and hierarchy rules; Impeccable supplies product context and the task playbook. Load and follow both originals. This wrapper adds routing and synthesis.

## Dependencies and discovery

Required: `refactoring-ui` and `impeccable`, including their references, assets, and Impeccable launcher. Optional: `lean-pr-review` for the Lean mode below.

Resolve dependencies from the session's skill catalog, including plugin-qualified names. Use the supplied path or skill-reading tool; read the complete SKILL.md, paging if needed. Names and links do not automatically load other skills.

If absent from the catalog, read the bundled sibling skills at `../refactoring-ui/SKILL.md` and `../impeccable/SKILL.md`, resolving paths from this wrapper's directory. Resolve each dependency's references from its own folder. If a required skill is unreadable, name it and mark the combined workflow blocked; do not install it implicitly.

## Route the request

- **PR / branch UI review** (default for a diff): read [references/pr-review.md](references/pr-review.md); use Impeccable's general-work routing and Refactoring UI's diagnosis reference. A PR does not automatically invoke full critique or Lean.
- **Surface critique** (standalone design review): load Impeccable's `critique` playbook and Refactoring UI's diagnosis reference. Review only; propose fixes.
- **Audit** (explicit technical UI audit): load Impeccable's `audit` playbook (native variant when applicable) and Refactoring UI's diagnosis reference. Do not also run a full critique automatically.
- **Polish / apply fixes** (authorized edits): load Impeccable's matching refinement playbook and relevant Refactoring UI references. Preserve identity/behavior within scope; read Impeccable's craft floor immediately before UI edits.
- **Lean PR Review**: only when the user explicitly requests Lean review; follow the separate integration below. A PR URL alone does not select Lean mode.

An invocation with no target or task follows Impeccable's no-argument routing menu; do not start a command automatically. If two Impeccable commands fit, use its clarification rule. A new surface or replacement design belongs to Impeccable's new-work route, with Refactoring UI loaded; do not treat it as refinement.

For every PR/branch review, read the PR reference even when a named playbook is selected. Explicit or clearly implied Impeccable commands retain their full playbooks; do not call a scoped PR review `impeccable critique`.

Examples (Codex; use `/ui-review` in hosts with slash commands):

- `$ui-review critique the settings screen at /settings`
- `$ui-review review the UI changes in this PR against its base`
- `$ui-review audit src/components/Checkout.tsx`
- `$ui-review polish the settings form; apply the fixes`
- `$ui-review Lean PR Review of this branch against origin/main, full run`

## Run the selected workflow

1. Resolve target, user task, scope, and incumbent evidence. For PR work record head/base and confirm the rendered revision. Read project instructions and existing tokens/components.
2. Follow Impeccable Setup: context launcher once per session, from its own base directory with project cwd; preserve its failure announcement/fallback. Follow the selected playbook's assessments, persistence, cleanup, output, and stopping requirements.
3. Before styling cards, callouts, alerts, list items, timeline steps, or selected states, read the bundled [Manicure](../manicure/SKILL.md); never add a colored or thick left-edge accent stripe. Apply Refactoring UI's systems, hierarchy, hard rules, and relevant references. Do not copy its tokens merely to review. Record conflicts with incumbent constraints; never silently discard a rule or replace the design system. Resolve conflicts before edits they block, preserving user choices and higher-priority instructions.
4. Synthesize by root cause and user impact. Distinguish deterministic checks, observed behavior, visual judgment, and hypotheses. Verify detector hits; preference alone is not a defect.

For `critique`, give Refactoring UI to Assessment A; keep detector findings out until A finishes. Preserve the playbook's assessment independence, subagent consent rules, orchestration, and provenance/degradation banners. Wrapper invocation does not grant subagent consent. Never silently substitute a single-context checklist.

## Browser evidence and verification

Inspect the rendered target using available browser tools and the playbook's tool constraints. Batch desktop and mobile captures (or shipped native device classes); include the user's viewport when relevant. Exercise the primary task and relevant focus, error, empty/loading, theme, or overflow states. Report which checks ran.

For authorized fixes, use Impeccable's bounded cycle: one batched inspection, one batched fix, at most one confirmation round. Reuse existing evidence instead of starting another detector or polishing loop. Clean up temporary servers/prototypes as the playbook requires.

If the app cannot run, use committed fixtures/goldens when available; check revision/theme freshness. Mark source-only, stale, or missing evidence. Code and screenshots do not prove live interaction or accessibility checks. Use only supported browser APIs and report unsupported overlays/injection.

## Findings and output

Deliver the selected playbook's required report and artifacts, adding this synthesis within its structure rather than dropping required scores, provenance, run notes, trend, or closing questions.

Each finding includes priority, target and file:line when known, evidence (capture/viewport/state or code/check result), user impact, smallest concrete fix, and supporting rule. Merge duplicates by root cause; cross-link runtime and visual issues. Put material problems first; separate taste options. Retain strengths, verification limits, and unresolved conflicts. Do not invent locations, measurements, scores, or checks.

## Optional Lean PR Review

Load `lean-pr-review` and follow its phases, mode-selection rules, gates/full-run semantics, references, nit limits, bug taxonomy, red-pen pass, and local HTML artifact requirements. Wrapper invocation alone does not select a full run or skip gates.

Apply the combined workflow to UI concerns in the agreed PR scope; Lean covers all slices and runtime analysis. Share browser evidence and merge root-cause findings into Lean's synthesis. Preserve required Impeccable reports/provenance alongside Lean's report. Keep UI priorities distinct from Lean bug/footgun/nit categories.

Do not automatically load `lean-pr-review-visual`: its interactive CSS-variant workflow and browser integrations are a separate opt-in with their own requirements. General UI review needs no Lean dependency or public deployment.

## Local and no-post defaults

Review requests authorize analysis, evidence collection, and the selected playbook's local reports, not product-code fixes. Apply fixes only when requested. Do not install skills, change agent configuration/hooks, or repair unrelated context drift as a side effect.

Keep reports local. Do not post comments, submit reviews, send messages, push, merge, or publish during this workflow. A later external action needs separate authorization; comment content needs exact approval, including required attribution. A Lean full run does not authorize publication. Follow the user's attribution requirements for approved external text.
