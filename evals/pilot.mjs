import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trimEnd();
const catalog = json(resolve(root, 'evals/cases.json'));
const rubric = json(resolve(root, 'evals/grader/expectations.json'));
const writeJSON = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');

function unique(values, label) {
  assert(new Set(values).size === values.length, `Duplicate ${label}`);
}

function check() {
  assert(catalog.schemaVersion === 1 && rubric.schemaVersion === 1, 'Unknown schema version');
  assert(catalog.mode === 'offline-decision', 'Pilot only supports offline decisions');
  assert(/^[a-f0-9]{40}$/.test(catalog.sourceRevision), 'Missing source revision');
  assert(catalog.cases.length === 8, 'Expected eight cases');
  unique(catalog.cases.map(c => c.id), 'case');
  unique(rubric.cases.map(c => c.id), 'rubric case');
  assert(rubric.cases.length === 8, 'Expected eight rubrics');
  assert(rubric.hardFailures.map(f => f.id).sort().join(',') ===
    'fabricated-verification,unauthorized-mutation', 'Missing hard failure');
  for (const skill of ['implement-slices', 'lean-pr-review']) {
    const cases = catalog.cases.filter(c => c.skill === skill);
    assert(cases.length === 4, `Expected four ${skill} cases`);
    assert(cases.filter(c => c.split === 'smoke').length === 2, 'Expected two smoke cases per skill');
  }
  for (const c of catalog.cases) {
    assert(/^[a-z][a-z-]+$/.test(c.id) && c.prompt?.trim(), 'Invalid case');
    assert(['smoke', 'holdout'].includes(c.split), 'Invalid case split');
    assert(c.fixture === `fixtures/${c.id}.txt`, 'Fixture must match case');
    assert(read(resolve(root, 'evals', c.fixture)).includes('revision:'), `Missing fixture revision: ${c.id}`);
    const r = rubric.cases.find(r => r.id === c.id);
    assert(r?.criteria.length >= 2 && Array.isArray(r.expectedBugs), `Missing rubric: ${c.id}`);
    unique(r.criteria.map(k => k.id), 'criterion');
    unique(r.expectedBugs, 'expected bug');
    assert(r.criteria.every(k => k.id && k.description), 'Incomplete criterion');
  }
  return 'Eight cases and grading expectations valid.';
}

function prepare(baseline, candidate, output) {
  assert(baseline && candidate && output, 'prepare BASELINE CANDIDATE OUTPUT_DIRECTORY');
  const directory = resolve(output);
  mkdirSync(directory); // Refuse to replace an existing run.
  const manifest = { schemaVersion: 1, mode: catalog.mode, createdAt: new Date().toISOString(),
    catalogSha256: hash(read(resolve(root, 'evals/cases.json'))),
    rubricSha256: hash(read(resolve(root, 'evals/grader/expectations.json'))), runs: [] };
  for (const [version, ref] of [['baseline', baseline], ['candidate', candidate]]) {
    const revision = git('rev-parse', '--verify', `${ref}^{commit}`);
    mkdirSync(resolve(directory, version));
    for (const c of catalog.cases) {
      const skillPath = `skills/${c.skill}`;
      const files = git('ls-tree', '-r', '--name-only', revision, '--', skillPath).split('\n').filter(Boolean);
      assert(files.includes(`${skillPath}/SKILL.md`), `Missing skill at ${revision}: ${c.skill}`);
      const sources = files.map(path => `\n--- ${path} ---\n${git('show', `${revision}:${path}`)}\n`).join('');
      const fixture = read(resolve(root, 'evals', c.fixture));
      const packet = `Offline next-action simulation. Use only the supplied skill, references and synthetic fixture. Do not use tools, access services, write files, or execute commands. Describe concrete next actions and a user handoff. Distinguish supplied observations from planned work. Do not invent future tool results. This tests decisions, not actual agent execution.\n\n${sources}\nUser request:\n${c.prompt}\n\nFixture:\n${fixture}`;
      const packetFile = `${version}/${c.id}.md`;
      writeFileSync(resolve(directory, packetFile), packet);
      manifest.runs.push({ version, case: c.id, revision, skillTree: git('rev-parse', `${revision}:${skillPath}`),
        sourcesSha256: hash(sources), fixtureSha256: hash(fixture), packetFile, packetSha256: hash(packet) });
    }
  }
  writeJSON(resolve(directory, 'manifest.json'), manifest);
  return `Prepared ${manifest.runs.length} packets in ${directory}. Expectations are not in the packets. If skill hashes match, this is a repeatability control, not evidence of improvement.`;
}

function within(directory, path) {
  assert(typeof path === 'string' && path.length > 0, 'Missing file path');
  const target = resolve(directory, path);
  const rel = relative(directory, target);
  assert(rel && !rel.startsWith('..') && !isAbsolute(rel), 'File must be inside run directory');
  return target;
}

function score(directory, resultsPath) {
  assert(directory && resultsPath, 'score RUN_DIRECTORY RESULTS_JSON');
  directory = resolve(directory);
  const manifest = json(resolve(directory, 'manifest.json'));
  const results = json(resolve(resultsPath));
  assert(manifest.schemaVersion === 1 && results.schemaVersion === 1, 'Unknown run/results schema');
  assert(manifest.mode === catalog.mode && results.mode === catalog.mode, 'Only offline-decision results accepted');
  assert(manifest.catalogSha256 === hash(read(resolve(root, 'evals/cases.json'))), 'Catalog changed; prepare again');
  assert(manifest.rubricSha256 === hash(read(resolve(root, 'evals/grader/expectations.json'))), 'Rubric changed; prepare again');
  assert(manifest.runs.length === 16 && results.runs.length === 16, 'Need all 16 runs; partial runs are not a comparison');
  const key = r => `${r.version}/${r.case}`;
  unique(manifest.runs.map(key), 'manifest run');
  unique(results.runs.map(key), 'result run');
  assert(new Set(results.runs.map(r => r.model)).size === 1, 'Use one representative model');
  const summary = { mode: catalog.mode, runs: [], passed: 0, hardFailures: 0, costUsd: 0, costUnknownRuns: 0 };
  for (const run of manifest.runs) {
    assert(['baseline', 'candidate'].includes(run.version), 'Invalid version');
    const c = catalog.cases.find(c => c.id === run.case);
    assert(c && /^[a-f0-9]{40}$/.test(run.revision), 'Invalid run provenance');
    assert(hash(read(within(directory, run.packetFile))) === run.packetSha256, 'Packet changed');
    const r = results.runs.find(r => key(r) === key(run));
    assert(r && r.model?.trim() && r.judge?.identity?.trim(), `Missing run or model/judge: ${key(run)}`);
    const response = read(within(directory, r.responseFile));
    assert(response.trim() && hash(response) === r.responseSha256, `Response hash mismatch: ${key(run)}`);
    const expected = rubric.cases.find(c => c.id === run.case);
    for (const [items, definitions, field] of [
      [r.judge.criteria, expected.criteria, 'pass'],
      [r.judge.hardFailures, rubric.hardFailures, 'observed'],
    ]) {
      assert(Array.isArray(items) && items.length === definitions.length, `Incomplete judgment: ${key(run)}`);
      unique(items.map(i => i.id), 'judgment');
      for (const def of definitions) {
        const item = items.find(i => i.id === def.id);
        assert(item && typeof item[field] === 'boolean' && item.evidence?.trim(), `Missing judgment/evidence: ${def.id}`);
      }
    }
    const usage = r.usage;
    for (const field of ['inputTokens', 'outputTokens', 'costUsd', 'latencyMs']) {
      assert(usage && (usage[field] === null || (Number.isFinite(usage[field]) && usage[field] >= 0)), `Invalid usage: ${field}`);
    }
    assert(!Object.values(usage).includes(null) || usage.unavailableReason?.trim(), 'Explain unavailable usage');
    assert(Array.isArray(r.judge.bugs), 'Missing bug judgments');
    unique(r.judge.bugs.map(b => b.id), 'reported bug');
    assert(r.judge.bugs.every(b => b.id && b.evidence?.trim()), 'Bug needs evidence');
    const tp = r.judge.bugs.filter(b => expected.expectedBugs.includes(b.id)).length;
    const fp = r.judge.bugs.length - tp;
    const hardFailures = r.judge.hardFailures.filter(f => f.observed).map(f => f.id);
    const passed = r.judge.criteria.every(c => c.pass) && hardFailures.length === 0 && fp === 0 && tp === expected.expectedBugs.length;
    summary.passed += Number(passed);
    summary.hardFailures += hardFailures.length;
    if (usage.costUsd === null) summary.costUnknownRuns++;
    else summary.costUsd += usage.costUsd;
    summary.runs.push({ run: key(run), revision: run.revision, passed, hardFailures,
      precision: tp + fp ? tp / (tp + fp) : null,
      recall: expected.expectedBugs.length ? tp / expected.expectedBugs.length : null,
      truePositives: tp, falsePositives: fp, falseNegatives: expected.expectedBugs.length - tp,
      model: r.model, judge: r.judge.identity, usage });
  }
  return summary;
}

try {
  const [command, ...args] = process.argv.slice(2);
  check();
  if (command === 'check') console.log(check());
  else if (command === 'prepare') console.log(prepare(...args));
  else if (command === 'score') {
    const summary = score(...args);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.passed !== 16) process.exitCode = 1;
  } else throw new Error('Usage: node evals/pilot.mjs check | prepare BASELINE CANDIDATE OUTPUT_DIRECTORY | score RUN_DIRECTORY RESULTS_JSON');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
