// Runs setup/claude/setup.sh and setup/cursor/setup.sh against a temporary
// HOME, with stub `claude`, `git`, and `sudo` commands first on PATH. Nothing
// here touches the real home directory or the network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const setupDir = fileURLToPath(new URL(".", import.meta.url));
const repoDir = join(setupDir, "..");
const rule = readFileSync(join(repoDir, "rules/teal-preferences.mdc"), "utf8");
const BEGIN = "<!-- BEGIN teallarson/skills: preferences -->";
const END = "<!-- END teallarson/skills: preferences -->";

const write = (path, text, mode) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
  if (mode) chmodSync(path, mode);
};

// Fake `claude plugin ...`: keeps added marketplaces and installed plugins in
// files under $STUB_STATE, and fails `install` for the id in $STUB_FAIL_INSTALL.
const claudeStub = `#!/bin/bash
echo "claude $*" >>"$STUB_STATE/calls"
touch "$STUB_STATE/marketplaces" "$STUB_STATE/plugins"
case "$1 $2 $3" in
  "plugin marketplace list") sed 's/.*/{"repo": "&"}/' "$STUB_STATE/marketplaces" ;;
  "plugin marketplace add") echo "$4" >>"$STUB_STATE/marketplaces" ;;
  "plugin list --json") sed 's/.*/{"id": "&"}/' "$STUB_STATE/plugins" ;;
  "plugin install "*)
    if [ "$3" = "$STUB_FAIL_INSTALL" ]; then echo "stub: install failed" >&2; exit 3; fi
    echo "$3" >>"$STUB_STATE/plugins" ;;
  *) echo "stub: unexpected claude $*" >&2; exit 99 ;;
esac
`;

// Fake git: "clones" by copying $STUB_REPOS/<repo name>, and fails clones of
// the URL in $STUB_FAIL_CLONE.
const gitStub = `#!/bin/bash
echo "git $*" >>"$STUB_STATE/calls"
if [ "$1" = clone ]; then
  url="$4" dest="$5"
  if [ "$url" = "$STUB_FAIL_CLONE" ]; then echo "stub: clone failed" >&2; exit 128; fi
  name=$(basename "$url" .git)
  cp -R "$STUB_REPOS/$name" "$dest" && mkdir -p "$dest/.git" && echo "$url" >"$dest/.git/origin"
elif [ "$1" = -C ] && [ "$3" = remote ]; then
  cat "$2/.git/origin"
elif [ "$1" = -C ] && { [ "$3" = fetch ] || [ "$3" = reset ]; }; then
  exit 0
else
  echo "stub: unexpected git $*" >&2; exit 99
fi
`;

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "skills-setup-"));
  const home = join(root, "home");
  const bin = join(root, "bin");
  const state = join(root, "state");
  const repos = join(root, "repos");
  mkdirSync(home);
  mkdirSync(state);
  write(join(bin, "claude"), claudeStub, 0o755);
  write(join(bin, "git"), gitStub, 0o755);
  write(join(bin, "sudo"), '#!/bin/bash\nexec "$@"\n', 0o755);

  const skill = (dir, name) => write(join(dir, name, "SKILL.md"), `---\nname: ${name}\n---\n`);
  skill(join(repos, "ai-plugin/skills"), "building-a-dashboard");
  write(join(repos, "ai-plugin/agents/error-analyzer.md"), "posthog agent\n");
  skill(join(repos, "vercel-plugin/skills"), "vercel-cli");
  for (const a of ["ai-architect", "deployment-expert", "performance-optimizer"]) {
    write(join(repos, `vercel-plugin/agents/${a}.md`), `${a}\n`);
  }
  skill(join(repos, "ui-ux-pro-max-skill/.claude/skills"), "ui-ux-pro-max");
  return { root, home, bin, state, repos };
}

function run(fx, script, env = {}) {
  const result = spawnSync("bash", [join(setupDir, script)], {
    encoding: "utf8",
    env: {
      PATH: `${fx.bin}:/usr/bin:/bin`,
      HOME: fx.home,
      STUB_STATE: fx.state,
      STUB_REPOS: fx.repos,
      ...env,
    },
  });
  return { status: result.status, out: result.stdout + result.stderr };
}

const calls = (fx) => (existsSync(join(fx.state, "calls")) ? readFileSync(join(fx.state, "calls"), "utf8") : "");

// Lists every path under dir with its file content, to compare two runs.
function snapshot(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(`${p.slice(dir.length)}\n${e.isSymbolicLink() ? `-> ${readlinkSync(p)}` : readFileSync(p, "utf8")}`);
    }
  };
  walk(dir);
  return out.join("\n---\n");
}

test("claude: keeps existing CLAUDE.md text and adds the preferences once", () => {
  const fx = makeFixture();
  const claudeMd = join(fx.home, ".claude/CLAUDE.md");
  write(claudeMd, "# My notes\nkeep this line");

  const r = run(fx, "claude/setup.sh");
  assert.equal(r.status, 0, r.out);
  const text = readFileSync(claudeMd, "utf8");
  assert.ok(text.startsWith("# My notes\nkeep this line\n\n" + BEGIN + "\n"), text.slice(0, 200));
  assert.ok(text.trimEnd().endsWith(END));
  assert.ok(text.includes("# Teal's working preferences"));
  assert.ok(!text.includes("alwaysApply"), "front matter should be removed");
  assert.equal(readFileSync(claudeMd + ".bak", "utf8"), "# My notes\nkeep this line");
  for (const id of ["teal@teallarson", "ui-ux-pro-max@ui-ux-pro-max-skill", "vercel@claude-plugins-official", "posthog@claude-plugins-official"]) {
    assert.ok(calls(fx).includes(`claude plugin install ${id}`), id);
  }
});

test("claude: a second run changes nothing and adds nothing", () => {
  const fx = makeFixture();
  const claudeMd = join(fx.home, ".claude/CLAUDE.md");
  write(claudeMd, "# My notes\n");
  assert.equal(run(fx, "claude/setup.sh").status, 0);
  const first = readFileSync(claudeMd, "utf8");
  const callsAfterFirst = calls(fx);

  const r = run(fx, "claude/setup.sh");
  assert.equal(r.status, 0, r.out);
  assert.equal(readFileSync(claudeMd, "utf8"), first);
  const secondCalls = calls(fx).slice(callsAfterFirst.length);
  assert.ok(!/marketplace add|plugin install/.test(secondCalls), secondCalls);
  assert.equal(first.split(BEGIN).length - 1, 1);
});

test("claude: replaces an outdated block and keeps text on both sides", () => {
  const fx = makeFixture();
  const claudeMd = join(fx.home, ".claude/CLAUDE.md");
  write(claudeMd, `before\n${BEGIN}\nold preferences\n${END}\nafter\n`);
  assert.equal(run(fx, "claude/setup.sh").status, 0);
  const text = readFileSync(claudeMd, "utf8");
  assert.ok(text.startsWith(`before\n${BEGIN}\n`));
  assert.ok(text.endsWith(`${END}\nafter\n`));
  assert.ok(!text.includes("old preferences"));
});

test("claude: a failed install is reported and the exit code is non-zero", () => {
  const fx = makeFixture();
  const r = run(fx, "claude/setup.sh", { STUB_FAIL_INSTALL: "vercel@claude-plugins-official" });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /FAIL  install vercel@claude-plugins-official \(exit 3\)/);
  assert.match(r.out, /1 step\(s\) failed/);
  assert.ok(calls(fx).includes("claude plugin install posthog@claude-plugins-official"), "later installs still run");
  assert.ok(existsSync(join(fx.home, ".claude/CLAUDE.md")), "CLAUDE.md is still written");
});

test("claude: damaged markers leave CLAUDE.md untouched and fail", () => {
  const fx = makeFixture();
  const claudeMd = join(fx.home, ".claude/CLAUDE.md");
  const original = `notes\n${BEGIN}\nno end marker\n`;
  write(claudeMd, original);
  const r = run(fx, "claude/setup.sh");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /1 BEGIN and 0 END markers/);
  assert.equal(readFileSync(claudeMd, "utf8"), original);
});

test("claude: missing claude CLI is a failure, not a silent skip", () => {
  const fx = makeFixture();
  const r = run(fx, "claude/setup.sh", { PATH: "/usr/bin:/bin" });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /claude CLI not found/);
});

test("cursor: installs skills, agents, rule, and local plugins", () => {
  const fx = makeFixture();
  const r = run(fx, "cursor/setup.sh");
  assert.equal(r.status, 0, r.out);
  const cursor = join(fx.home, ".cursor");
  assert.equal(readFileSync(join(cursor, "rules/teal-preferences.mdc"), "utf8"), rule);
  assert.equal(readFileSync(join(cursor, "plugins/local/teal/rules/teal-preferences.mdc"), "utf8"), rule);
  for (const skillMd of [join(cursor, "skills/implement-slices/SKILL.md"), join(cursor, "plugins/local/teal/skills/implement-slices/SKILL.md")]) {
    const text = readFileSync(skillMd, "utf8");
    assert.ok(text.includes("Follow the `build-slices` skill"), skillMd);
    assert.ok(!text.includes("`teal:researcher`"), skillMd);
  }
  assert.ok(!existsSync(join(cursor, "plugins/local/teal/.git")));
  assert.ok(!existsSync(join(fx.home, ".claude")), "Cursor setup must not write into ~/.claude");
  assert.ok(!existsSync(join(fx.root, "rootdir")), "root links are opt-in");
  assert.match(r.out, /cursor: \d+ skills, \d+ subagents/);
});

test("cursor: a second run gives the same files and exits 0", () => {
  const fx = makeFixture();
  assert.equal(run(fx, "cursor/setup.sh").status, 0);
  const first = snapshot(fx.home);
  const r = run(fx, "cursor/setup.sh");
  assert.equal(r.status, 0, r.out);
  assert.equal(snapshot(fx.home), first);
});

test("cursor: leaves a user's own skill alone and reports it", () => {
  const fx = makeFixture();
  const mine = join(fx.home, ".cursor/skills/worktree/SKILL.md");
  write(mine, "my own worktree skill\n");
  const r = run(fx, "cursor/setup.sh");
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /FAIL  skill worktree/);
  assert.match(r.out, /was not created by this setup; left alone/);
  assert.equal(readFileSync(mine, "utf8"), "my own worktree skill\n");
});

test("cursor: a failed clone is reported and other sources still install", () => {
  const fx = makeFixture();
  const r = run(fx, "cursor/setup.sh", { STUB_FAIL_CLONE: "https://github.com/vercel/vercel-plugin.git" });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /FAIL  fetch vercel \(exit 128\)/);
  assert.match(r.out, /FAIL  exists: .*vercel-cli\/SKILL\.md/);
  assert.ok(existsSync(join(fx.home, ".cursor/skills/building-a-dashboard/SKILL.md")));
});

test("cursor: CURSOR_LINK_ROOT=1 links rules and agents, and reruns cleanly", () => {
  const fx = makeFixture();
  const rootDir = join(fx.root, "rootdir");
  const env = { CURSOR_LINK_ROOT: "1", CURSOR_ROOT_DIR: rootDir };
  assert.equal(run(fx, "cursor/setup.sh", env).status, 0);
  const r = run(fx, "cursor/setup.sh", env);
  assert.equal(r.status, 0, r.out);
  assert.ok(lstatSync(join(rootDir, "rules")).isSymbolicLink());
  assert.equal(readlinkSync(join(rootDir, "agents")), join(fx.home, ".cursor/agents"));
});

test("cursor: refuses to replace a real directory with a root link", () => {
  const fx = makeFixture();
  const rootDir = join(fx.root, "rootdir");
  write(join(rootDir, "rules/existing.mdc"), "keep\n");
  const r = run(fx, "cursor/setup.sh", { CURSOR_LINK_ROOT: "1", CURSOR_ROOT_DIR: rootDir });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /is not a symlink; left alone/);
  assert.equal(readFileSync(join(rootDir, "rules/existing.mdc"), "utf8"), "keep\n");
});
