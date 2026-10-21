# Cursor setup

```bash
setup/cursor/setup.sh
```

Use it on a desktop machine or in a Cursor cloud agent's setup step. It installs:

- **Skills** into `~/.cursor/skills/`: this repo's skills, plus the ones from [PostHog/ai-plugin](https://github.com/PostHog/ai-plugin), [vercel/vercel-plugin](https://github.com/vercel/vercel-plugin), and [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
- **Subagents** into `~/.cursor/agents/`: this repo's agents, plus the PostHog and Vercel ones.
- **The preferences rule** into `~/.cursor/rules/teal-preferences.mdc`.
- **Local plugins** into `~/.cursor/plugins/local/`: `teal` (a copy of this checkout), `vercel`, and `ui-ux-pro-max`. For `ui-ux-pro-max` it writes a `.cursor-plugin/plugin.json` when upstream doesn't ship one.

At the end it checks that the expected skills, agents, and plugin files exist, and prints how many skills and subagents Cursor now has.

## Changes for Cursor

Cursor has no Workflow tool and names plugin agents without the `teal:` prefix, so two changes are made in both `~/.cursor/skills/` and the local `teal` plugin:

- **`build-slices` skill.** [`skills/build-slices/SKILL.md`](./skills/build-slices/SKILL.md) runs the same stages as [`workflows/build-slices.js`](../../workflows/build-slices.js), using Cursor subagents. It lives under `setup/` so Claude Code and `npx skills` don't pick it up next to the real workflow.
- **`implement-slices` edits.** `` `teal:researcher` ``, `` `teal:ui-checker` ``, and `` `teal:reviewer` `` become the bare agent names. The Workflow tool call becomes "Follow the `build-slices` skill". If that Workflow sentence is no longer in the skill, the step fails, so a change to `implement-slices` can't silently skip the edit.

## Files that already exist

The script replaces only paths it created on an earlier run, or paths whose content already matches. Anything else is left alone and reported as a failed step. This covers:

- A skill or agent with the same name that you added yourself.
- A clone of this repo at `~/.cursor/plugins/local/teal`. Running the script from that clone also fails, because it would replace itself. Run it from a checkout somewhere else.
- Files left by an older setup script. Move them aside and rerun.

Third-party clones in the cache are updated with `git fetch` and `git reset --hard`. That happens only when the folder is a checkout of the expected URL; otherwise the step fails and the folder is left alone.

If two sources ship a skill or agent with the same name, the first one installed wins and the second is reported as a failed step.

## Root links (opt-in)

With `CURSOR_LINK_ROOT=1`, the script also runs `sudo ln -sfn` to link `/.cursor/rules` and `/.cursor/agents` to the folders in `~/.cursor`. The cloud agent setup this script came from did this, presumably so an agent working at `/` sees the same rules and agents. That reason wasn't checked, so it is off by default. An existing file, folder, or link pointing somewhere else at either path is never replaced.

## Not done

- Nothing is written to `~/.claude/agents/`. Claude Code gets the same agents from its own plugins (see [../claude/README.md](../claude/README.md)), and copying them there would list them twice.
- The PostHog repo is used for skills and agents only, not installed as a local plugin.

## Prerequisites

`bash`, `git`, `python3` (for the `implement-slices` edit), and network access to GitHub. `sudo` only with `CURSOR_LINK_ROOT=1`.
