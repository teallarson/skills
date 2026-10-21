---
name: build-slices
description: Implement an approved plan as parallel slices in separate worktrees, merge them, run the full checks, then review the result independently. Use after the slices, the files each slice owns, and the shared types or signatures between them are named.
---

# Build slices

This is the Cursor form of the `build-slices` workflow (`workflows/build-slices.js` in teallarson/skills). Cursor can't run that workflow, so you run the same stages with subagents.

Before planning a broad read, use the `researcher` subagent. After a UI change is on a running server, use the `ui-checker` subagent. This skill is the part where the slice agents and the `reviewer` subagent work together.

You need all of these, or stop and say which is missing:

- task: what the whole change must do
- base: branch to start from
- seam: shared types, function signatures, and file ownership
- integrationBranch: branch the merged result ends up on
- checks: command that runs the full lint and test suite
- slices: each with name, branch, owns (paths), and instructions

## Implement

With one slice, build it on the integration branch. With more than one, launch one subagent per slice at the same time. Create each worktree first (`git worktree add`), and give that subagent only its own worktree.

Prompt for each slice:

- It is implementing one slice of a larger change, in its own git worktree. Other agents are implementing the other slices at the same time.
- Include the whole change, the slice name, its instructions, the files it owns, and the shared contract it must not change.
- Steps: create the branch from the base (the integration branch when there is one slice, otherwise the slice branch); edit only owned files; if the slice cannot be done without another file or a contract change, stop and report that instead of doing it; write a failing test first where practical; run the lint and tests that cover those files; commit; do not push; detach HEAD so the branch can be checked out from another worktree.
- Return the branch, commits (SHA and subject), files changed, the exact check commands, whether they passed, the last lines of check output, and anything done outside the owned files or the seam (or "none").

If a slice returns nothing, stop before integration and name the missing slices. If a slice reports failing checks, continue and say so.

## Integrate

Skip this when there is one slice.

Launch one subagent in its own worktree:

- Merge the slice branches into one branch and get the full checks passing.
- Steps: create the integration branch from the base; merge each slice branch with `--no-ff`, in the order the slice agents returned; resolve each conflict so the result matches the shared contract and record it; run the full check command; if checks fail because of how the slices fit together, fix that and rerun; do not redesign a slice, and stop if a failure needs that; commit; do not push; detach HEAD.
- Return the branch, what was merged, each conflict and how it was resolved (or "none"), fixes made after the merge (or "none"), the check commands, whether they passed, and the last lines of output.

If it returns nothing, stop and say integration failed. Keep the slice branches.

## Review

Launch the `reviewer` subagent. Give it the task and `git diff <base>...<integration branch>` only. Do not include what the implementers said they did. It reports findings it confirmed by reading the code or running something: file, line, what goes wrong and under what input, how it confirmed it, and the fix. An empty list is a valid result. It does not edit files.

If that subagent cannot be launched, do the same review in a fresh subagent that receives only the task and the diff.

## Done

Return the integration branch, each slice result, the integration result, and the review. Leave the worktrees until the branch is verified. Do not push, and do not open a PR unless asked.

Before starting over, read the branches and any notes already written. Keep finished work.
