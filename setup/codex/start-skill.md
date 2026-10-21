---
name: start-environment
description: Get a Codex Cloud checkout ready for the current task. Read the repo's agent instructions and Makefile, start only the services the task needs, check that they respond, and report anything missing. Use at the start of a task that needs running services.
---

# Start the environment for this task

## Read first

- The checkout's `AGENTS.md`, and any rules files it points to (for example `.agents/RULES.md`, `.cursor/rules/`, or `CONTRIBUTING.md`).
- The Makefile for the part of the repo the task touches. In a repo with several apps or packages, use the one closest to the files you'll change, not only the root one.
- The personal preferences at `~/.cache/codex-skill-sources/teal/rules/teal-preferences.mdc`. Read them even when the install script kept an existing `~/.codex/AGENTS.md` instead of linking them. If `CODEX_HOME` is set, use it instead of `~/.codex`.

## Check what's installed

- Note the checkout path and commit (`git rev-parse --show-toplevel`, `git rev-parse HEAD`).
- Check that the tools the task needs run (for example `node --version`, `uv --version`, `go version`), along with the task's dependencies.
- Skills are in `~/.agents/skills` and the repo's `.agents/skills`. If a skill you need is missing from the skill list, read its `SKILL.md` directly.

## Start services

- Start only the services the task needs, using the Makefile targets or documented commands. Don't start the whole stack by default.
- Check each one: record the URL you called and the response you got. A process that started is not the same as a service that answers.
- Installing Docker doesn't mean the daemon is running. Run `docker info` before anything that needs containers.
- If configuration, secrets, or Docker access are missing, report it. Don't change security settings or make up values.

## Dependencies

If dependency files changed since the environment was published, say which install step needs to run again (the install script doesn't rerun when the repo is refreshed). Don't rewrite lockfiles to make an install pass.

## Report

Report these separately:

- What was installed and which versions.
- Which services are reachable, with the URL and response for each.
- Which tests ran, and their results.
- What's missing.
