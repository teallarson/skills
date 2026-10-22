# Cursor setup

```bash
setup/cursor/setup.sh
```

Use it on a desktop machine or in a Cursor cloud agent's setup step. It installs:

- **Skills** into `~/.cursor/skills/`: this repo's skills, plus the ones from [PostHog/ai-plugin](https://github.com/PostHog/ai-plugin), [vercel/vercel-plugin](https://github.com/vercel/vercel-plugin), and [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
- **Subagents** into `~/.cursor/agents/`: this repo's agents, plus the PostHog and Vercel ones.
- **The preferences rule** into `~/.cursor/rules/teal-preferences.mdc`.

Each source is installed in one place only. Don't also clone this repo into `~/.cursor/plugins/local/teal`, or its skills will be listed twice. Machines set up with older versions of this script may have copies in `~/.cursor/plugins/local/` that list skills twice; delete those folders.

At the end it checks that this repo's skills, agents, and rule were installed, and prints how many skills and subagents Cursor now has. Third-party skills and agents aren't checked by name, so an upstream rename doesn't fail the run. A missing third-party skills or agents folder is still reported.

If `~/.cursor` or the cache folder can't be written, the script reports one failure and stops.

## Changes for Cursor

Cursor has no Workflow tool, and agents installed in `~/.cursor/agents/` have no `teal:` prefix, so two changes are made in `~/.cursor/skills/`:

- **`build-slices` skill.** [`skills/build-slices/SKILL.md`](./skills/build-slices/SKILL.md) runs the same stages as [`workflows/build-slices.js`](../../workflows/build-slices.js), using Cursor subagents. It lives under `setup/` so Claude Code and `npx skills` don't pick it up next to the real workflow.
- **`implement-slices` edits.** `` `teal:researcher` ``, `` `teal:ui-checker` ``, and `` `teal:reviewer` `` become the bare agent names. The Workflow tool call becomes "Follow the `build-slices` skill". If that Workflow sentence is no longer in the skill, the step fails, so a change to `implement-slices` can't silently skip the edit.

## Files that already exist

The script replaces only paths it created on an earlier run, or paths whose content already matches. Anything else is left alone and reported as a failed step. This covers:

- A skill or agent with the same name that you added yourself.
- Files left by another setup script. Move them aside and rerun.

Third-party clones in the cache are updated with `git fetch` and `git reset --hard`. That happens only when the folder is a checkout of the expected URL; otherwise the step fails and the folder is left alone.

If two sources ship a skill or agent with the same name, the first one installed wins and the second is reported as a failed step.

## Root links (opt-in)

With `CURSOR_LINK_ROOT=1`, the script also runs `sudo ln -sfn` to link `/.cursor/rules` and `/.cursor/agents` to the folders in `~/.cursor`. It's off by default because it needs `sudo` and writes outside your home folder. An existing file, folder, or link pointing somewhere else at either path is never replaced.

## Prerequisites

`bash`, `git`, `python3` (for the `implement-slices` edit), and network access to GitHub. `sudo` only with `CURSOR_LINK_ROOT=1`.
