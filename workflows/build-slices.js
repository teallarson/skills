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
          problem: { type: 'string', description: 'what goes wrong and under what input' },
          confirmedBy: { type: 'string', description: 'measured or inferred, and how' },
          fix: { type: 'string' },
        },
        required: ['file', 'problem', 'confirmedBy', 'fix'],
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

function implementPrompt(slice) {
  // With one slice there is nothing to merge, so it is built straight on the integration branch.
  const branch = isSingleSlice ? args.integrationBranch : slice.branch
  return `You are implementing one slice of a larger change, in your own git worktree. Other agents are implementing the other slices at the same time in other worktrees.

Whole change: ${args.task}

Your slice: ${slice.name}
${slice.instructions}

Files you own: ${slice.owns.join(', ')}

Shared contract every slice follows (do not change it):
${args.seam}

Steps:
1. Run: git switch -c ${branch} ${args.base}
2. Edit only the files you own. If the slice cannot be done without touching another file or changing the shared contract, stop and explain in "deviations" instead of doing it.
3. Where practical, write a failing test first, then make it pass.
4. Run the lint and tests that cover your files, and fix what fails.
5. Commit on ${branch} with a clear message. Do not push.

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

Whole change: ${args.task}

Shared contract the slices were built against:
${args.seam}

Steps:
1. Run: git switch -c ${args.integrationBranch} ${args.base}
2. Merge each branch with --no-ff, in this order: ${branches.join(', ')}
3. Resolve any conflict so the result matches the shared contract. Record each one.
4. Run: ${args.checks}
5. If checks fail because of how the slices fit together, fix that and rerun. Do not redesign a slice; if a failure needs that, stop and report it.
6. Commit on ${args.integrationBranch}. Do not push.

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
// The reviewer gets the task and the diff range only, so it judges the code rather than the implementers' account of it.
const reviewPrompt = `Review this change independently. Read the diff and the code around it yourself.

What the change must do: ${args.task}

Diff: git diff ${args.base}...${args.integrationBranch}

Report only findings you confirmed by reading the code path or running something. For each: file, line, what goes wrong and under what input, how you confirmed it, and the fix. If you find nothing real, return an empty list. Do not edit files.`

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
