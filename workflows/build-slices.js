export const meta = {
  name: 'build-slices',
  description: 'Implement an approved plan as parallel slices in separate worktrees, merge them, run the full checks, then review the result independently',
  whenToUse: 'After a plan names its slices, the files each slice owns, and the shared types or signatures between them. Run through the implement-slices skill, which writes the plan and the args.',
  phases: [
    { title: 'Implement', detail: 'one Sonnet 4.6 agent per slice, each in its own worktree and branch', model: 'claude-sonnet-4-6' },
    { title: 'Integrate', detail: 'merge slice branches, run the full checks', model: 'claude-sonnet-4-6' },
    { title: 'Review', detail: 'independent review of the merged diff on the session model' },
  ],
}

// args: {
//   task: string,               what the whole change must do, in the user's terms
//   acceptanceCriteria: string, optional approved observable results; defaults to task
//   scope: string,              optional approved boundaries
//   nonGoals: string,           optional explicit exclusions
//   base: string,               branch to start from, e.g. "main"
//   seam: string,               shared types, function signatures, and file ownership every slice must follow
//   integrationBranch: string,  branch the merged result ends up on
//   checks: string,             commands that run the full lint and test suite
//   slices: [{ name, branch, owns: [paths], instructions }]
// }

const SLICE_RESULT = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    commits: { type: 'array', items: { type: 'string' }, description: 'SHA and subject of each commit' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    checksRun: { type: 'string', description: 'exact commands run' },
    checksPassed: { type: 'boolean' },
    checksOutputTail: { type: 'string', description: 'last lines of check output' },
    deviations: { type: 'string', description: 'anything done outside the owned files or the seam, or "none"' },
  },
  required: ['branch', 'commits', 'checksPassed', 'deviations'],
}

const INTEGRATION_RESULT = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    merged: { type: 'array', items: { type: 'string' } },
    conflictsResolved: { type: 'string', description: 'each conflict and how it was resolved, or "none"' },
    fixesMade: { type: 'string', description: 'changes made after merging to get checks passing, or "none"' },
    checksRun: { type: 'string' },
    checksPassed: { type: 'boolean' },
    checksOutputTail: { type: 'string' },
  },
  required: ['branch', 'merged', 'checksPassed', 'checksOutputTail'],
}

const REVIEW_RESULT = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          kind: { type: 'string', enum: ['correctness', 'maintainability'] },
          blocking: { type: 'boolean', description: 'requires a fix to meet requirements or prevent a supported failure; optional suggestions are false' },
          problem: { type: 'string', description: 'wrong behavior and triggering input, or concrete maintenance/testing cost against the actual requirement' },
          confirmedBy: { type: 'string', description: 'measured or inferred, and how' },
          fix: { type: 'string' },
        },
        required: ['file', 'kind', 'blocking', 'problem', 'confirmedBy', 'fix'],
      },
    },
    checksRun: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['findings', 'summary'],
}

for (const field of ['task', 'base', 'seam', 'integrationBranch', 'checks', 'slices']) {
  if (!args || !args[field]) {
    throw new Error(`build-slices needs args.${field}`)
  }
}

const slices = args.slices
const isSingleSlice = slices.length === 1
const taskContext = `Whole change: ${args.task}

Approved acceptance criteria:
${args.acceptanceCriteria || args.task}

Scope: ${args.scope || 'Only the requested behavior and owned files.'}
Non-goals: ${args.nonGoals || 'No unrelated changes.'}`

const minimality = `Use the simplest existing mechanism that meets the acceptance criteria. Add an abstraction or automatic recovery only for a concrete unmet requirement. Preserve required safety checks and meaningful regression tests; do not add speculative defenses or unrelated fixes.`

function implementPrompt(slice) {
  // With one slice there is nothing to merge, so it is built straight on the integration branch.
  const branch = isSingleSlice ? args.integrationBranch : slice.branch
  return `You are implementing ${isSingleSlice ? "the change on the integration branch" : "one slice of a larger change alongside other agents"}, in your own git worktree.

${taskContext}

Your slice: ${slice.name}
${slice.instructions}

Files you own: ${slice.owns.join(', ')}

Shared contract every slice follows (do not change it):
${args.seam}

${minimality}

Steps:
1. Run: git switch -c ${branch} ${args.base}
2. Edit only the files you own. If the slice cannot be done without touching another file or changing the shared contract, stop and explain in "deviations" instead of doing it.
3. Add focused tests where behavior or risk warrants them. Prefer an existing check over a new harness.
4. Run the lint and tests that cover your files.${isSingleSlice ? ` Run the full checks too: ${args.checks}` : ''} Fix failures introduced by your change. Compare other failures against ${args.base}, report the evidence, and leave unrelated fixes out of scope. If you cannot establish the cause, report it as unresolved.
5. Commit on ${branch} with a clear message. Do not push.
6. Run: git switch --detach   (so ${branch} can be checked out from other worktrees)

Return the branch, commits, files changed, the exact check commands and whether they passed.`
}

phase('Implement')
const sliceResults = await parallel(slices.map((slice) => () =>
  agent(implementPrompt(slice), {
    label: `slice:${slice.name}`,
    phase: 'Implement',
    model: 'claude-sonnet-4-6',
    isolation: 'worktree',
    schema: SLICE_RESULT,
  })
))

const missing = slices.filter((_, i) => !sliceResults[i]).map((s) => s.name)
if (missing.length > 0) {
  log(`Stopping before integration: no result from ${missing.join(', ')}`)
  return { status: 'slice_failed', missing, slices: sliceResults }
}
for (const [i, result] of sliceResults.entries()) {
  if (!result.checksPassed) {
    log(`Slice ${slices[i].name} reported failing checks; integration will see them`)
  }
}

let integration = null
if (isSingleSlice) {
  log('One slice: skipping the merge step')
} else {
  phase('Integrate')
  const branches = sliceResults.map((r) => r.branch)
  integration = await agent(`Merge these slice branches into one branch and get the full checks passing. You are in your own git worktree.

${taskContext}

Shared contract the slices were built against:
${args.seam}

${minimality}

Steps:
1. Run: git switch -c ${args.integrationBranch} ${args.base}
2. Merge each branch with --no-ff, in this order: ${branches.join(', ')}
3. Resolve any conflict so the result matches the shared contract. Record each one.
4. Run: ${args.checks}
5. Fix failures introduced where the slices meet and rerun. Compare other failures against ${args.base} and report evidence for pre-existing or unresolved failures; do not fix unrelated problems. Do not redesign a slice; if a failure needs that, stop and report it.
6. Commit on ${args.integrationBranch}. Do not push.
7. Run: git switch --detach   (so ${args.integrationBranch} can be checked out from the main checkout)

Return the branch, what you merged, conflicts and fixes, the check commands, whether they passed, and the last lines of their output.`, {
    label: 'integrate',
    phase: 'Integrate',
    model: 'claude-sonnet-4-6',
    isolation: 'worktree',
    schema: INTEGRATION_RESULT,
  })
  if (!integration) {
    return { status: 'integration_failed', slices: sliceResults }
  }
}

phase('Review')
// Approved requirements go to the reviewer; implementer summaries do not.
const reviewPrompt = `Review this change independently. Read the diff and the code around it yourself.

${taskContext}

Shared contract:
${args.seam}

Diff: git diff ${args.base}...${args.integrationBranch}

Independently inspect the code, callers, and relevant verification evidence. Run applicable checks (${args.checks}) when practical; distinguish what you ran, what you inferred, and what remains unverified. Compare failures against ${args.base} before attributing them to this change; report pre-existing or unresolved failures separately from introduced failures.

${minimality}

Independently of functional bugs, report supported unnecessary abstractions as maintainability findings: name the actual requirement, concrete maintenance/testing cost, and simpler behavior-preserving alternative. A runtime bug is not required for such a finding. Separate blocking correctness failures from optional suggestions; mark blocking only when required behavior or a supported failure warrants it. The main session decides which findings to act on and independently verifies the result.

Report only findings supported by code or a check. For each: file, line, kind (correctness or maintainability), blocking, problem, how you confirmed it, and a concrete fix. Do not invent a bug to justify optional cleanup. Give a concise verdict and evidence limits in summary. If you find nothing real, return an empty list. Do not edit files.`

let review = null
try {
  review = await agent(reviewPrompt, { label: 'review', phase: 'Review', agentType: 'teal:reviewer', schema: REVIEW_RESULT })
} catch (error) {
  log(`teal:reviewer agent unavailable (${error.message}); using a plain agent on the session model`)
  review = await agent(reviewPrompt, { label: 'review', phase: 'Review', schema: REVIEW_RESULT })
}

return {
  status: 'done',
  branch: args.integrationBranch,
  slices: sliceResults,
  integration,
  review,
}
