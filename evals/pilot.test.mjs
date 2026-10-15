import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = (...args) => spawnSync(process.execPath, ['evals/pilot.mjs', ...args], { cwd: root, encoding: 'utf8' });
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const rubric = json(resolve(root, 'evals/grader/expectations.json'));

function prepared(fn) {
  const directory = mkdtempSync(resolve(tmpdir(), 'skills-eval-test-'));
  try {
    const run = resolve(directory, 'run');
    assert.equal(cli('prepare', 'HEAD', 'HEAD', run).status, 0);
    const manifest = json(resolve(run, 'manifest.json'));
    // These controls exercise accounting only. They are not model responses or model grades.
    const results = { schemaVersion: 1, mode: 'offline-decision', runs: manifest.runs.map(r => {
      const expected = rubric.cases.find(c => c.id === r.case);
      const response = 'Synthetic accounting control. No agent was executed.\n';
      const responseFile = `${r.version}/${r.case}.response.txt`;
      writeFileSync(resolve(run, responseFile), response);
      return { version: r.version, case: r.case, model: 'synthetic-test-control', responseFile,
        responseSha256: createHash('sha256').update(response).digest('hex'),
        usage: { inputTokens: null, outputTokens: null, costUsd: null, latencyMs: null, unavailableReason: 'Synthetic control' },
        judge: { identity: 'synthetic-test-control',
          criteria: expected.criteria.map(c => ({ id: c.id, pass: true, evidence: 'Synthetic positive control' })),
          hardFailures: rubric.hardFailures.map(f => ({ id: f.id, observed: false, evidence: 'Synthetic positive control' })),
          bugs: expected.expectedBugs.map(id => ({ id, evidence: 'Synthetic positive control' })) } };
    }) };
    const score = () => {
      const path = resolve(run, 'results.json');
      writeFileSync(path, JSON.stringify(results));
      return cli('score', run, path);
    };
    fn({ run, results, score, manifest });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('catalog is valid and preparation excludes grader files', () => prepared(({ run, manifest }) => {
  assert.equal(cli('check').status, 0);
  assert.equal(manifest.runs.length, 16);
  for (const r of manifest.runs) {
    const packet = readFileSync(resolve(run, r.packetFile), 'utf8');
    assert.match(packet, /SKILL.md/);
    assert.doesNotMatch(packet, /expectedBugs|grader\/expectations|"hardFailures"/);
    assert.match(r.revision, /^[a-f0-9]{40}$/);
  }
  assert.notEqual(cli('prepare', 'HEAD', 'HEAD', run).status, 0);
}));

test('synthetic positive control accounts for unknown costs without inventing zero', () => prepared(({ score }) => {
  const r = score();
  assert.equal(r.status, 0, r.stderr);
  const summary = JSON.parse(r.stdout);
  assert.equal(summary.passed, 16);
  assert.equal(summary.costUnknownRuns, 16);
  assert.equal(summary.knownCostUsd, 0);
  assert.equal(summary.totalCostUsd, null);
}));

for (const id of ['fabricated-verification', 'unauthorized-mutation']) {
  test(`${id} overrides otherwise passing judgments`, () => prepared(({ results, score }) => {
    results.runs.find(r => r.version === 'baseline' && r.case === 'lr-publish').judge.hardFailures.find(f => f.id === id).observed = true;
    const r = score();
    assert.equal(r.status, 1);
    const summary = JSON.parse(r.stdout);
    assert.equal(summary.hardFailures, 1);
    assert.equal(summary.runs.find(r => r.run === 'baseline/lr-publish').passed, false);
  }));
}

test('blanket refusal and missed/extra bugs fail positive controls', () => prepared(({ results, score }) => {
  for (const r of results.runs) for (const c of r.judge.criteria) c.pass = false;
  results.runs.find(r => r.case === 'lr-defect').judge.bugs = [];
  results.runs.find(r => r.case === 'lr-invariant').judge.bugs = [{ id: 'undefined-key', evidence: 'Synthetic false positive' }];
  const r = score();
  assert.equal(r.status, 1);
  const summary = JSON.parse(r.stdout);
  assert.equal(summary.passed, 0);
  assert.equal(summary.runs.find(r => r.run === 'baseline/lr-defect').recall, 0);
  assert.equal(summary.runs.find(r => r.run === 'baseline/lr-invariant').falsePositives, 1);
}));

test('partial or ungraded comparisons are rejected', () => prepared(({ results, score }) => {
  const saved = results.runs.pop();
  assert.match(score().stderr, /all 16/);
  results.runs.push(saved);
  results.runs[0].judge.hardFailures = [];
  assert.match(score().stderr, /Incomplete judgment/);
}));

test('changed response or packet is rejected', () => prepared(({ results, score, run, manifest }) => {
  const path = resolve(run, results.runs[0].responseFile);
  const saved = readFileSync(path);
  writeFileSync(path, 'edited transcript');
  assert.match(score().stderr, /Response hash mismatch/);
  writeFileSync(path, saved);
  writeFileSync(resolve(run, manifest.runs[0].packetFile), 'edited prompt');
  assert.match(score().stderr, /Packet changed/);
}));

test('baseline and candidate source hashes match when skill contents match', () => prepared(({ manifest }) => {
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  for (const c of manifest.runs.filter(r => r.version === 'baseline')) {
    const candidate = manifest.runs.find(r => r.version === 'candidate' && r.case === c.case);
    assert.equal(c.revision, revision);
    assert.equal(c.sourcesSha256, candidate.sourcesSha256);
  }
}));

test('fabricated revisions and source metadata are rejected', () => prepared(({ manifest, run, score }) => {
  const save = () => writeFileSync(resolve(run, 'manifest.json'), JSON.stringify(manifest));
  const candidates = manifest.runs.filter(r => r.version === 'candidate');
  const revision = candidates[0].revision;
  for (const r of candidates) r.revision = 'f'.repeat(40);
  save();
  const invalidRevision = score();
  assert.equal(invalidRevision.status, 1);
  assert.equal(invalidRevision.stdout, '');
  for (const r of candidates) r.revision = revision;
  for (const field of ['skillTree', 'sourcesSha256', 'fixtureSha256', 'packetSha256']) {
    const saved = candidates[0][field];
    candidates[0][field] = '0'.repeat(field === 'skillTree' ? 40 : 64);
    save();
    assert.match(score().stderr, new RegExp(`Provenance mismatch: candidate/.* ${field}`));
    candidates[0][field] = saved;
  }
  candidates[0].revision = execFileSync('git', ['rev-parse', 'HEAD~1'], { cwd: root, encoding: 'utf8' }).trim();
  save();
  assert.match(score().stderr, /Need one candidate revision/);
}));
