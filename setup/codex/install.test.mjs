// Runs setup/codex/install.sh against a fake repo and a temporary HOME, with
// stub system commands first on PATH. Nothing here installs anything, touches
// the real home directory, or uses the network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("install.sh", import.meta.url));

const write = (path, text, mode) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
  if (mode) chmodSync(path, mode);
};

// Each stub records "<command> <args> @ <cwd>" and succeeds, except where noted.
const log = 'echo "$(basename "$0") $* @ $PWD" >>"$STUB_STATE/calls"';
const stubs = {
  sudo: `#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n`,
  "apt-get": `#!/bin/bash\n${log}\n`,
  // Writes a fake mise installer that puts a mise stub and one shim in HOME.
  curl: `#!/bin/bash
${log}
while [ $# -gt 0 ]; do [ "$1" = -o ] && out="$2"; shift; done
cat >"$out" <<'EOF'
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/mise/shims"
printf '#!/bin/bash\\nif [ "$1" = --version ]; then echo "%s linux-x64"; else echo "mise $* @ $PWD" >>"$STUB_STATE/calls"; fi\\n' "$MISE_VERSION" >"$HOME/.local/bin/mise"
printf '#!/bin/bash\\necho shim\\n' >"$HOME/.local/share/mise/shims/fake-tool"
chmod +x "$HOME/.local/bin/mise" "$HOME/.local/share/mise/shims/fake-tool"
EOF
`,
  git: `#!/bin/bash
${log}
if [ "$1" = clone ]; then
  name=$(basename "$4" .git)
  cp -R "$STUB_REPOS/$name" "$5" && mkdir -p "$5/.git" && echo "$4" >"$5/.git/origin"
elif [ "$1" = -C ] && [ "$3" = remote ]; then
  cat "$2/.git/origin"
elif [ "$1" = -C ] && [ "$3" = rev-parse ] && [ "$4" = --show-toplevel ]; then
  (cd "$2" && pwd)
elif [ "$1" = -C ] && [ "$3" = status ]; then
  cat "$2/.git/dirty" 2>/dev/null || true
elif [ "$1" = -C ] && [ "$3" = pull ]; then
  exit 0
elif [ "$1" = rev-parse ] || [ "$3" = rev-parse ]; then
  echo 0123abc
else
  echo "stub: unexpected git $*" >&2; exit 99
fi
`,
  docker: `#!/bin/bash\n${log}\n[ "$1" = info ] && exit 1\nexit 0\n`,
  go: `#!/bin/bash\n${log}\n[ "$1" = --version ] && exit 2\n[ "$1" = version ] && echo "go version stub"\nexit 0\n`,
  node: `#!/bin/bash\n${log}\necho v22.0.0\n`,
};
for (const tool of ["bun", "npm", "uv"]) {
  stubs[tool] = `#!/bin/bash\n${log}\n[ "$1" = --version ] && { echo "${tool} stub"; exit 0; }\n[ "$STUB_FAIL" = ${tool} ] && { echo "stub: ${tool} failed" >&2; exit 4; }\nexit 0\n`;
}

function makeFixture({ omit = [] } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "codex-install-")));
  const fx = {
    root,
    home: join(root, "home"),
    bin: join(root, "bin"),
    state: join(root, "state"),
    repos: join(root, "repos"),
    repo: join(root, "repo"),
    links: join(root, "usr-local-bin"),
  };
  for (const dir of [fx.home, fx.state, fx.links]) mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(stubs)) {
    if (!omit.includes(name)) write(join(fx.bin, name), body, 0o755);
  }

  write(join(fx.repo, ".tool-versions"), "go 1.23.0\n");
  write(join(fx.repo, "bun.lock"), "{}\n");
  write(join(fx.repo, "web/package-lock.json"), "{}\n");
  write(join(fx.repo, "py/uv.lock"), "\n");
  write(join(fx.repo, "svc/go.mod"), "module example.com/svc\n");
  write(join(fx.repo, "node_modules/dep/go.mod"), "module ignored\n");
  write(join(fx.repo, "svc/testdata/go.mod"), "module ignored\n");

  const skill = (dir, name) => write(join(fx.repos, dir, name, "SKILL.md"), `---\nname: ${name}\n---\n`);
  skill("skills/skills", "lean-pr-review");
  write(join(fx.repos, "skills/rules/teal-preferences.mdc"), "# prefs\n");
  skill("ai-plugin/skills", "building-a-dashboard");
  skill("vercel-plugin/skills", "vercel-cli");
  skill("ui-ux-pro-max-skill/.claude/skills", "ui-ux-pro-max");
  return fx;
}

function run(fx, env = {}) {
  const r = spawnSync("bash", [script], {
    cwd: fx.repo,
    encoding: "utf8",
    env: {
      PATH: `${fx.bin}:/usr/bin:/bin`,
      HOME: fx.home,
      STUB_STATE: fx.state,
      STUB_REPOS: fx.repos,
      BIN_LINK_DIR: fx.links,
      ...env,
    },
  });
  return { status: r.status, out: r.stdout + r.stderr };
}

const calls = (fx) => (existsSync(join(fx.state, "calls")) ? readFileSync(join(fx.state, "calls"), "utf8") : "");

test("install.sh passes bash -n", () => {
  const r = spawnSync("bash", ["-n", script], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("installs dependencies, skills, and links in a fake environment", () => {
  const fx = makeFixture();
  const r = run(fx);
  assert.equal(r.status, 0, r.out);
  const c = calls(fx);

  assert.match(c, /apt-get install -y --no-install-recommends ca-certificates curl git build-essential pkg-config jq python3 @/);
  assert.match(c, /mise trust /);
  assert.match(c, /mise install @/);
  assert.ok(c.includes(`bun install --frozen-lockfile @ ${fx.repo}\n`), c);
  assert.ok(c.includes(`npm ci @ ${fx.repo}/web\n`), c);
  assert.ok(c.includes(`uv sync --locked --all-extras @ ${fx.repo}/py\n`), c);
  assert.ok(c.includes(`go mod download @ ${fx.repo}/svc\n`), c);
  assert.ok(!c.includes("node_modules/dep"), "node_modules is skipped");
  assert.ok(!c.includes("testdata"), "testdata is skipped");
  assert.ok(!c.includes("mise use"), "node is already available");

  for (const s of ["lean-pr-review", "building-a-dashboard", "vercel-cli", "ui-ux-pro-max"]) {
    assert.ok(lstatSync(join(fx.home, ".agents/skills", s)).isSymbolicLink(), s);
  }
  assert.equal(
    readlinkSync(join(fx.home, ".codex/AGENTS.md")),
    join(fx.home, ".cache/codex-skill-sources/teal/rules/teal-preferences.mdc"),
  );
  assert.equal(readlinkSync(join(fx.links, "mise")), join(fx.home, ".local/bin/mise"));
  assert.equal(readlinkSync(join(fx.links, "fake-tool")), join(fx.home, ".local/share/mise/shims/fake-tool"));
  assert.match(r.out, /go: go version stub/);
  assert.match(r.out, /Docker daemon unavailable/);
  assert.match(r.out, /Preferences: .*teal-preferences\.mdc/);
  assert.match(r.out, /No app services or tests were run/);
});

test("a second run updates clones instead of cloning and keeps links", () => {
  const fx = makeFixture();
  assert.equal(run(fx).status, 0);
  const before = calls(fx).length;
  const r = run(fx);
  assert.equal(r.status, 0, r.out);
  const second = calls(fx).slice(before);
  assert.ok(!/git clone|^curl /m.test(second), second);
  assert.match(second, /pull --ff-only/);
});

test("keeps an existing AGENTS.md", () => {
  const fx = makeFixture();
  write(join(fx.home, ".codex/AGENTS.md"), "my own\n");
  const r = run(fx);
  assert.equal(r.status, 0, r.out);
  assert.equal(readFileSync(join(fx.home, ".codex/AGENTS.md"), "utf8"), "my own\n");
  assert.match(r.out, /Existing .*AGENTS\.md preserved/);
});

test("CODEX_HOME moves AGENTS.md", () => {
  const fx = makeFixture();
  const codexHome = join(fx.root, "codex-home");
  assert.equal(run(fx, { CODEX_HOME: codexHome }).status, 0);
  assert.ok(lstatSync(join(codexHome, "AGENTS.md")).isSymbolicLink());
});

test("stops on a skill name collision", () => {
  const fx = makeFixture();
  write(join(fx.home, ".agents/skills/vercel-cli/SKILL.md"), "mine\n");
  const r = run(fx);
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /Skill collision at .*vercel-cli/);
  assert.match(r.out, /Install failed at line \d+/);
  assert.equal(readFileSync(join(fx.home, ".agents/skills/vercel-cli/SKILL.md"), "utf8"), "mine\n");
});

test("refuses to update a skill source clone with local changes", () => {
  const fx = makeFixture();
  assert.equal(run(fx).status, 0);
  write(join(fx.home, ".cache/codex-skill-sources/posthog/.git/dirty"), " M skills/x\n");
  const r = run(fx);
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /Local changes in .*posthog; refusing to overwrite/);
});

test("a failed dependency install stops the script", () => {
  const fx = makeFixture();
  const r = run(fx, { STUB_FAIL: "uv" });
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /stub: uv failed/);
  assert.match(r.out, /Failed in \.\/py: uv sync --locked --all-extras/);
  assert.match(r.out, /Install failed at line \d+/);
  assert.ok(!calls(fx).includes("go mod download"), "later installs don't run");
});

test("DEP_ROOTS limits where projects are found", () => {
  const fx = makeFixture();
  const r = run(fx, { DEP_ROOTS: "web" });
  assert.equal(r.status, 0, r.out);
  const c = calls(fx);
  assert.ok(c.includes(`npm ci @ ${fx.repo}/web\n`), c);
  assert.ok(!/bun install|uv sync|go mod download/.test(c), c);
});

test("a missing DEP_ROOTS folder fails before any install", () => {
  const fx = makeFixture();
  const r = run(fx, { DEP_ROOTS: "web nope" });
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /DEP_ROOTS entry not found: nope/);
  assert.ok(!calls(fx).includes("npm ci"), calls(fx));
});

test("installs node with mise only when node is missing and a version is set", () => {
  const fx = makeFixture({ omit: ["node"] });
  assert.equal(run(fx).status, 0);
  assert.match(calls(fx), /mise use --global node@22/);

  const fx2 = makeFixture({ omit: ["node"] });
  assert.equal(run(fx2, { NODE_FALLBACK_VERSION: "" }).status, 0);
  assert.ok(!calls(fx2).includes("mise use"));
});

test("installs the Docker CLI when missing and skips it with INSTALL_DOCKER=0", () => {
  const fx = makeFixture({ omit: ["docker"] });
  assert.equal(run(fx).status, 0);
  assert.match(calls(fx), /apt-get install -y --no-install-recommends docker\.io/);
  assert.match(calls(fx), /docker-compose-v2/);

  const fx2 = makeFixture({ omit: ["docker"] });
  assert.equal(run(fx2, { INSTALL_DOCKER: "0" }).status, 0);
  assert.ok(!calls(fx2).includes("docker.io"));
});

test("skips mise install when the repo has no tool version files", () => {
  const fx = makeFixture();
  spawnSync("rm", [join(fx.repo, ".tool-versions")]);
  assert.equal(run(fx).status, 0);
  assert.ok(!/mise (trust|install)/.test(calls(fx)), calls(fx));
});

test("stops with a clear message when a project's tool is missing", () => {
  const fx = makeFixture({ omit: ["bun"] });
  const r = run(fx);
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /Bun projects found, but bun is not installed/);
});

test("refuses to update a skill source clone from a different URL", () => {
  const fx = makeFixture();
  assert.equal(run(fx).status, 0);
  write(join(fx.home, ".cache/codex-skill-sources/vercel/.git/origin"), "https://example.com/other.git\n");
  const r = run(fx);
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /vercel is a clone of a different URL/);
});
