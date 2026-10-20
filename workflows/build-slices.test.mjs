import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./build-slices.js', import.meta.url), 'utf8');
const runWorkflow = new (Object.getPrototypeOf(async function () {}).constructor)(
  'args', 'phase', 'parallel', 'agent', 'log', source.replace('export const meta', 'const meta'),
);

async function run({ count = 1, fallback = false, context = true } = {}) {
  const calls = [];
  const args = {
    task: 'Copy the fixed file and create a draft PR', base: 'main', seam: 'Use the existing copy command',
    integrationBranch: 'fix/copy', checks: 'node --test',
    slices: Array.from({ length: count }, (_, i) => ({
      name: `part-${i}`, branch: `fix/part-${i}`, owns: [`part-${i}.js`], instructions: 'Preserve the fixed bytes',
    })),
    ...(context ? {
      acceptanceCriteria: 'Refuse an existing destination; stop after uncertain PR creation',
      scope: 'One source and destination', nonGoals: 'No automatic retry or workflow engine',
    } : {}),
  };
  const result = await runWorkflow(args, () => {}, tasks => Promise.all(tasks.map(t => t())), async (prompt, options) => {
    calls.push({ prompt, options });
    if (options.agentType && fallback) throw new Error('Named reviewer unavailable');
    if (options.phase === 'Review') return { findings: [], summary: 'Stub review; no provider executed' };
    const slice = args.slices.find(s => options.label === `slice:${s.name}`);
    return { branch: count === 1 || options.phase === 'Integrate' ? args.integrationBranch : slice.branch,
      checksPassed: true, checksOutputTail: 'IMPLEMENTER_REPORT_ONLY' };
  }, () => {});
  return { args, calls, result };
}

test('single slice carries approved context to implementer and reviewer and runs full checks without integration', async () => {
  const { args, calls, result } = await run();
  assert.deepEqual(calls.map(c => c.options.phase), ['Implement', 'Review']);
  assert.equal(result.integration, null);
  assert.equal(result.branch, args.integrationBranch);
  assert.match(calls[0].prompt, /git switch -c fix\/copy main/);
  assert.ok(calls[0].prompt.includes(`Run the full checks too: ${args.checks}`));
  for (const { prompt } of calls) {
    for (const field of ['task', 'acceptanceCriteria', 'scope', 'nonGoals', 'seam']) assert.ok(prompt.includes(args[field]), field);
    assert.match(prompt, /concrete unmet requirement/);
    assert.match(prompt, /against main/);
  }
  assert.doesNotMatch(calls[1].prompt, /IMPLEMENTER_REPORT_ONLY/);
});

test('multiple slices carry the same requirements through integration and preserve independent review', async () => {
  const { args, calls, result } = await run({ count: 2 });
  assert.deepEqual(calls.map(c => c.options.phase), ['Implement', 'Implement', 'Integrate', 'Review']);
  assert.match(calls[2].prompt, /fix\/part-0, fix\/part-1/);
  assert.ok(calls[2].prompt.includes(`Run: ${args.checks}`));
  for (const { prompt } of calls) {
    for (const field of ['acceptanceCriteria', 'scope', 'nonGoals']) assert.ok(prompt.includes(args[field]), field);
    assert.match(prompt, /unresolved/);
  }
  assert.equal(result.integration.branch, args.integrationBranch);
  assert.doesNotMatch(calls[3].prompt, /IMPLEMENTER_REPORT_ONLY/);
});

test('plain reviewer fallback preserves prompt, schema, and finding distinctions', async () => {
  const { calls } = await run({ fallback: true });
  const named = calls[1];
  const plain = calls[2];
  assert.equal(named.options.agentType, 'teal:reviewer');
  assert.equal(plain.options.agentType, undefined);
  assert.equal(named.prompt, plain.prompt);
  assert.deepEqual(named.options.schema, plain.options.schema);
  const finding = plain.options.schema.properties.findings.items;
  assert.deepEqual(finding.properties.kind.enum, ['correctness', 'maintainability']);
  assert.ok(finding.required.includes('kind'));
  assert.ok(finding.required.includes('blocking'));
  assert.equal(finding.properties.blocking.type, 'boolean');
  assert.match(plain.prompt, /runtime bug is not required/);
  assert.match(plain.prompt, /main session decides/i);
  assert.match(plain.prompt, /Independently inspect/);
});

test('existing callers can omit new context fields and use the task as acceptance criteria', async () => {
  const { args, calls, result } = await run({ context: false });
  assert.equal(result.status, 'done');
  for (const { prompt } of calls) {
    assert.ok(prompt.includes(`Approved acceptance criteria:\n${args.task}`));
    assert.match(prompt, /Scope: Only the requested behavior and owned files/);
    assert.doesNotMatch(prompt, /undefined/);
  }
});
