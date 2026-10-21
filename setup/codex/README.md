# Codex setup: not written yet

**Gap:** no Codex setup material was supplied, so there is no `setup/codex/setup.sh` and no Codex config here. Nothing below has been run or tested.

## Needed before writing it

- The Codex config in use (`~/.codex/config.toml` or equivalent), with any keys or tokens removed.
- Which plugins, MCP servers, and skills are installed.
- How preferences get to Codex: a symlinked `~/.codex/AGENTS.md`, a copy, or a marked block like the Claude Code one.
- Anything different for Codex cloud tasks.

## Placeholder

Until then, the repo [README](../../README.md#install) lists the documented manual steps: the Codex plugin commands and symlinking `~/.codex/AGENTS.md` to `rules/teal-preferences.mdc`. They aren't part of this setup, and these scripts don't check them.

When a Codex script is added, it should use `setup/lib.sh` for step reporting and the marked-block merge, and get fixture tests in `setup/setup.test.mjs`.
