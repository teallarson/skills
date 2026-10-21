# Codex Cloud setup

Two files for a Codex Cloud environment. They work with any repository:

| File | Where it goes | What it does |
|---|---|---|
| [`install.sh`](./install.sh) | The environment's **Install script**, or give the file to the environment's setup conversation | Installs tools, dependencies, and skills. Doesn't start services or run tests. |
| [`start-skill.md`](./start-skill.md) | The environment's **setup conversation**, or the start of a task | Tells the agent to read the repo's instructions, start only the services the task needs, check that they respond, and report what's missing. |

**Nothing here has been run in a real Codex Cloud environment.** It has only had the static and fixture tests listed under [Testing](#testing).

## Install script

Don't run `install.sh` on your own machine. It installs apt packages and writes links into `/usr/local/bin`.

What it does, in order:

1. Finds the repo root from the current folder, or from `REPO_DIR` if setup starts somewhere else.
2. Installs base apt packages (`ca-certificates curl git build-essential pkg-config jq python3`) plus `EXTRA_APT_PACKAGES`. It uses `sudo -n` when not running as root.
3. Installs the Docker CLI and compose plugin if missing. It doesn't start the Docker daemon.
4. Installs a fixed version of [mise](https://mise.jdx.dev) (`MISE_VERSION`). If the repo has `.tool-versions`, `mise.toml`, or `.mise.toml`, it runs `mise install`. If `node` still isn't available, it installs `node@$NODE_FALLBACK_VERSION`.
5. Links `mise` and its tool shims into `/usr/local/bin`, so they stay on `PATH` after the setup shell exits. Existing links with the same names are replaced.
6. Finds projects under `DEP_ROOTS` and installs their dependencies one at a time. Every install fails if the lockfile is out of date; lockfiles are never rewritten.

   | File found | Command |
   |---|---|
   | `bun.lock` or `bun.lockb` | `bun install --frozen-lockfile` |
   | `package-lock.json` | `npm ci` |
   | `uv.lock` | `uv sync --locked --all-extras` |
   | `go.mod` | `go mod download` |

   `.git`, `node_modules`, `.venv`, `vendor`, and `testdata` folders are skipped.
7. Clones each skill source into a cache and links its skills into `~/.agents/skills`. It refuses to overwrite a source clone with local changes, and stops if two skills share a name.
8. Links the preferences rule to `$CODEX_HOME/AGENTS.md` (default `~/.codex/AGENTS.md`). If that file already exists, it is kept and the script prints the path to add by hand.
9. Prints tool versions and whether the Docker daemon is reachable.

Any failed command stops the script and prints the line number.

### Settings

| Variable | Default | What it sets |
|---|---|---|
| `REPO_DIR` | current folder | Where the checkout is. |
| `DEP_ROOTS` | `.` | Space-separated folders, relative to the repo root, searched for projects. For example `"apps services"`. |
| `EXTRA_APT_PACKAGES` | empty | Extra apt packages, for example `postgresql-client`. |
| `MISE_VERSION` | `2026.7.5` | The mise version to install. |
| `NODE_FALLBACK_VERSION` | `22` | Node version installed when the repo doesn't provide one. Empty skips it. |
| `INSTALL_DOCKER` | `1` | `0` skips the Docker CLI. |
| `SKILL_SOURCES` | the four below | One source per line: name, git URL, skills folder. |
| `PREFERENCES_FILE` | `rules/teal-preferences.mdc` from the `teal` source | What `AGENTS.md` links to. |
| `SKILL_CACHE` | `~/.cache/codex-skill-sources` | Where skill sources are cloned. |
| `BIN_LINK_DIR` | `/usr/local/bin` | Where `mise` and shim links go. |

Skill sources, also listed near the top of `install.sh`:

- [teallarson/skills](https://github.com/teallarson/skills) (`skills/`)
- [PostHog/ai-plugin](https://github.com/PostHog/ai-plugin) (`skills/`)
- [vercel/vercel-plugin](https://github.com/vercel/vercel-plugin) (`skills/`)
- [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (`.claude/skills/`)

### Rerunning

Refreshing the repository in Codex Cloud doesn't rerun the Install script. When dependencies or skill sources change, rerun it from the environment settings and publish the environment again.

The script is safe to rerun. Skill links that already point at the right folder are kept, clones are updated with `git pull --ff-only`, and an `AGENTS.md` link that is already correct is left alone.

## Not included

- **No writing guide.** The preferences rule says to follow `~/.agents/technical-writing-guide.md` if it exists. This repo doesn't ship one, so the script doesn't install one. Add your own file there if you want it.
- **No repo-specific tools.** Dev servers, hot-reload tools, and database clients a particular repo needs belong in `EXTRA_APT_PACKAGES`, the repo's `.tool-versions`, or its own setup.
- **No Codex desktop or CLI config.** This covers Codex Cloud only. For local Codex, the repo [README](../../README.md#install) lists the plugin commands, and under [Rules](../../README.md#rules), symlinking `~/.codex/AGENTS.md` to `rules/teal-preferences.mdc`.

## Testing

```bash
node --test setup/codex/install.test.mjs
uvx --from shellcheck-py shellcheck -x setup/codex/install.sh
```

The tests check syntax with `bash -n` and run the script against a fake repo and a temporary `HOME`. Fake `sudo`, `apt-get`, `curl`, `git`, `mise`, `bun`, `npm`, `uv`, `go`, and `docker` commands are first on `PATH`, and `BIN_LINK_DIR` points into the temp folder.

What the tests don't cover:

- Real apt, mise, package managers, or GitHub clones. The fakes only record the commands.
- Whether Codex Cloud's Install script field, network rules, and `sudo` behave as the script expects.
- Whether Codex loads the linked skills and `AGENTS.md`.
- The start skill. It's instructions, not code.
