# Claude Code setup

```bash
setup/claude/setup.sh
```

It does three things:

1. Adds three plugin marketplaces: `anthropics/claude-plugins-official`, `teallarson/skills`, and `nextlevelbuilder/ui-ux-pro-max-skill`.
2. Installs `teal@teallarson`, `ui-ux-pro-max@ui-ux-pro-max-skill`, `vercel@claude-plugins-official`, and `posthog@claude-plugins-official`. After each install it checks `claude plugin list` to confirm the plugin is there.
3. Adds the preferences from `rules/teal-preferences.mdc` (without its front matter) to `~/.claude/CLAUDE.md`.

The plugins come from their GitHub marketplaces, so `teal@teallarson` matches this repo's default branch on GitHub, not the checkout you ran the script from. Only the `CLAUDE.md` block uses the checkout.

Marketplaces and plugins already present are skipped, not reinstalled or updated. Use `claude plugin marketplace update` to update them.

`CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` is set so marketplaces clone over HTTPS, which works on machines without a GitHub SSH key.

## CLAUDE.md

Claude Code doesn't load rules from plugins, so the preferences go in `~/.claude/CLAUDE.md` between these lines:

```markdown
<!-- BEGIN teallarson/skills: preferences -->
...
<!-- END teallarson/skills: preferences -->
```

- If the file doesn't exist, it's created with just the block.
- If the file has no block, the block is appended. Everything already in the file stays.
- If the file has one block, only the text between the markers is replaced.
- If the markers are damaged (one missing, duplicated, or out of order), the file isn't changed and the step fails.

Before any change to an existing file, the script copies it to `~/.claude/CLAUDE.md.bak`.

If your `CLAUDE.md` already imports the rule (for example `@~/src/skills/rules/teal-preferences.mdc`), the block would repeat it. Run with `SKIP_CLAUDE_MD=1`.

## Prerequisites

- The `claude` CLI on `PATH`. Without it, the plugin steps fail and the script exits 1, but `CLAUDE.md` is still updated.
- `git` and network access to GitHub, used by `claude plugin marketplace add`.
