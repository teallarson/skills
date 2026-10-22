# Agent setup

Scripts that set up a new machine or cloud agent VM with this repo's skills, agents, and preferences, plus the third-party plugins used alongside them.

| Client | Setup | Docs |
|---|---|---|
| Claude Code | `setup/claude/setup.sh` | [claude/README.md](./claude/README.md) |
| Cursor (desktop and cloud agents) | `setup/cursor/setup.sh` | [cursor/README.md](./cursor/README.md) |
| Codex Cloud | `setup/codex/install.sh` in the environment's Install script | [codex/README.md](./codex/README.md) |

Run the Claude Code and Cursor scripts from a checkout of this repo:

```bash
git clone --depth 1 https://github.com/teallarson/skills ~/src/skills
~/src/skills/setup/claude/setup.sh
~/src/skills/setup/cursor/setup.sh
```

What comes from the checkout differs by client:

- **Cursor:** everything from this repo (skills, agents, the preferences rule) is copied from the checkout.
- **Claude Code:** only the `CLAUDE.md` preferences block comes from the checkout. The `teal@teallarson` plugin is installed from the GitHub marketplace, so it matches the default branch on GitHub, not your checkout.

The Codex Cloud script is different: it runs inside the environment of the repo you work on, stops at the first error, and clones this repo as a skill source. See [codex/README.md](./codex/README.md).

## What the Claude Code and Cursor scripts do

- **Keeps existing files.** The scripts never overwrite a file or folder they didn't create. `~/.claude/CLAUDE.md` gets a marked block appended; Cursor skills, agents, and rules that you put there yourself are left alone and reported.
- **Is safe to rerun.** A second run gives the same files when nothing upstream changed. Nothing is added twice.
- **Shows failures.** Each step prints `ok` or `FAIL` with the command's own error output. The script keeps going, prints the failed steps at the end, and exits 1 if any step failed.

## Settings

Defaults work for a normal user account. Override with environment variables:

| Variable | Default | Used by | What it sets |
|---|---|---|---|
| `PREFERENCES_FILE` | `rules/teal-preferences.mdc` in this checkout | both | The preferences rule to install. Point it at your own `.mdc` to use different preferences. |
| `SKIP_CLAUDE_MD` | `0` | claude | `1` leaves `~/.claude/CLAUDE.md` alone, for example when it already imports the rule with `@path`. |
| `CURSOR_PLUGIN_CACHE` | `~/.cache/cursor-plugins` | cursor | Where third-party plugin repos are cloned. |
| `CURSOR_LINK_ROOT` | `0` | cursor | `1` also links `<root>/rules` and `<root>/agents` to the ones in `~/.cursor`, using `sudo`. |
| `CURSOR_ROOT_DIR` | `/.cursor` | cursor | The `<root>` above. |

The Cursor script records which paths it created in `~/.cursor/.teallarson-skills-owned.txt`. Only those paths, or paths whose content already matches, are replaced on later runs. If you delete that file, move the installed paths aside before rerunning.

## Testing

```bash
node --test setup/setup.test.mjs setup/codex/install.test.mjs
uvx --from shellcheck-py shellcheck -x setup/lib.sh setup/*/setup.sh setup/codex/install.sh   # or any shellcheck install
```

The tests run each script against a temporary `HOME` with fake `claude`, `git`, and `sudo` commands. They cover keeping existing `CLAUDE.md` text, reruns, a failed install, a failed clone, damaged markers, a user's own skill, a renamed third-party skill, an unwritable `~/.cursor`, and the root links. The Codex Cloud tests are described in [codex/README.md](./codex/README.md#testing). All of them pass with bash 3.2 (macOS) and bash 5.2 (Linux).

What the tests don't cover:

- The real `claude` CLI, real plugin marketplaces, and real GitHub clones. The fakes only mimic the commands the scripts call.
- Whether Claude Code or Cursor actually loads what was installed. That has to be checked in a new session on a real machine or cloud agent.
- Running on a real cloud agent VM or Codex Cloud environment.
