# skills

Agent skills for [Cursor](https://cursor.com/docs/agent/skills), Claude Code, Codex, and other skill-aware clients — reusable workflows for planning, review, and implementation.

Each skill is a directory with a `SKILL.md` file. Drop it into your personal skills folder (or symlink from this repo) and invoke it with `/skill-name`.

## Install

### As a plugin

| Client | Install | What loads |
|---|---|---|
| Claude Code | `/plugin marketplace add teallarson/skills`, then `/plugin install teal@teallarson` | skills, agents, the `build-slices` workflow |
| Codex | `codex plugin marketplace add teallarson/skills`, then `codex plugin add teal@teallarson` | skills |
| Cursor | `git clone https://github.com/teallarson/skills ~/.cursor/plugins/local/teal`, then **Developer: Reload Window** | skills, agents, the `teal-preferences` rule |

Installed skills and agents are named `teal:<name>` (for example `/teal:ooda-plan`, `teal:reviewer`). Codex doesn't load agents from plugins yet, and the workflow is Claude Code only; `implement-slices` has steps for running without it. Cursor ignores symlinks out of its plugin folder, so clone rather than link, and `git pull` to update.

Each client reads its own manifest: `.claude-plugin/` (Claude Code), `.cursor-plugin/` (Cursor), and the root `plugin.json` ([Agent Plugins 1.0](https://agent-plugins.org): Codex, Copilot, VS Code). `node scripts/check-manifests.mjs` checks they agree on name, version, and description; run it before pushing a manifest change.

### Skills only, for any agent

Use the [`skills`](https://github.com/vercel-labs/skills) CLI — it installs straight from GitHub (no manual clone), symlinks into every agent you have (Claude Code, Cursor, + ~70 others), and manages updates and removal:

```bash
npx skills add teallarson/skills           # choose skills interactively
npx skills add teallarson/skills -g        # install globally (~/.claude/skills, ~/.cursor/skills, …)
npx skills add teallarson/skills --list    # just see what's here
```

Re-sync or clean up anytime:

```bash
npx skills update    # pull the latest
npx skills remove    # uninstall
```

Skills symlink by default (single source of truth — no drift), so `npx skills update` is all it takes to stay current. Start a new agent session after installing so they're picked up.

<details>
<summary>Manual install (clone + symlink)</summary>

Without the CLI — clone once and symlink the skills you want:

```bash
git clone https://github.com/teallarson/skills.git ~/skills
ln -s ~/skills/skills/lean-pr-review ~/.claude/skills/lean-pr-review   # Claude Code
ln -s ~/skills/skills/lean-pr-review ~/.cursor/skills/lean-pr-review   # Cursor
```

Project-scoped skills go in `.claude/skills/` or `.cursor/skills/` at a repo root.
</details>

## Skills

| Skill | Invoke | What it does |
|-------|--------|--------------|
| [ooda-plan](./skills/ooda-plan/) | `/ooda-plan` | Write a fresh implementation plan as vertical slices with OODA loops and testable acceptance criteria |
| [slice-plan](./skills/slice-plan/) | `/slice-plan` | Reshape an existing horizontal plan into vertical slices |
| [lean-pr-review](./skills/lean-pr-review/) | `/lean-pr-review` | Concise findings, verdict, and evidence limits; walkthrough and HTML on request |
| [lean-pr-review-visual](./skills/lean-pr-review-visual/) | `/lean-pr-review-visual` | lean-pr-review + live before/after visual tweaks (chrome-devtools) for UI PRs |
| [agent-reviewer](./skills/agent-reviewer/) | `/agent-reviewer` | Review agents and skills for discoverability, structure, and token efficiency |
| [evaluate-agent-workflow](./skills/evaluate-agent-workflow/) | `/evaluate-agent-workflow` | Grade the shape of a multi-agent workflow (nodes, edges, state, gates) and whether the structure pays for itself |
| [claude-share-to-markdown](./skills/claude-share-to-markdown/) | `/claude-share-to-markdown` | Fetch a claude.ai `/share/` link past Cloudflare and save the full transcript (tool calls included) as Markdown |
| [implement-slices](./skills/implement-slices/) | `/implement-slices` | Plan a change as slices that own separate files, build them in parallel worktrees, merge, and review independently |
| [worktree](./skills/worktree/) | `/worktree` | Create and manage git worktrees, copying `.env` files across |
| [bugbot-fix](./skills/bugbot-fix/) | `/bugbot-fix` | Request a Cursor BugBot review on a PR, fix real findings, dismiss false ones, repeat up to 3 rounds |

Optional: install [Impeccable separately from upstream](https://github.com/pbakaus/impeccable#readme) for UI design guidance.

## Agents (plugin only)

| Agent | Model | Use it for |
|-------|-------|------------|
| [researcher](./agents/researcher.md) | Sonnet 4.6 | Reading across many files, docs, or pages and returning cited facts, without verdicts |
| [reviewer](./agents/reviewer.md) | Opus | Reviewing a finished change from the task and diff only, without the implementer's summary |
| [ui-checker](./agents/ui-checker.md) | Sonnet 4.6 | Using a changed screen in a real browser and reporting what rendered and what broke |

## Workflows (plugin only)

| Workflow | What it does |
|----------|--------------|
| [build-slices](./workflows/build-slices.js) | Runs one Sonnet 4.6 agent per slice in its own worktree, merges the branches and runs the full checks, then has the reviewer check the merged diff. Started by `implement-slices` after you approve the plan. |

## Rules

[`rules/teal-preferences.mdc`](./rules/teal-preferences.mdc) holds working preferences for any coding agent: PR habits, comment style, plain wording, and checking work before calling it done. Cursor applies it through the plugin. Claude Code and Codex don't load rules from plugins, so point them at the file directly: add `@path/to/teal-preferences.mdc` to `~/.claude/CLAUDE.md`, and symlink `~/.codex/AGENTS.md` to it.

> `lean-pr-review-visual` runs `lean-pr-review`'s phases and adds to them, so keep both installed side by side.

## Workflow

```
ooda-plan               →  how do we build this incrementally?
slice-plan              →  fix a plan that's gone horizontal
lean-pr-review          →  does every change earn its keep?
lean-pr-review-visual   →  …and does the UI look right? (before/after)
agent-reviewer          →  are our skills any good?
evaluate-agent-workflow →  is this multi-agent graph worth its structure?
```

### lean-pr-review

Reviews correctness, complexity, and relevant callers, then returns concise findings, a verdict, and evidence limits. Checks follow the changed behavior and risk; optional suggestions stay separate from required fixes.

Ask for a **conversational walkthrough** to stop at scope, walk order, intent, each slice, and completion. **Full run** or **one-shot** completes without intermediate gates. HTML is created only when requested; publishing it requires permission for that report, including any explicit prior permission.

**Example output:** [flypod review](https://9b04968f857642fd.flypod.dev/)

### lean-pr-review-visual

Everything `lean-pr-review` does, plus a **live visual pass** for UI slices. Prototype
polish in a real browser with the chrome-devtools MCP — inject CSS, capture before/after
at readable zoom, propose the exact class/style diff. Works against Storybook, a dev
server, or a deploy preview.

- **Phase 3:** For each UI slice, sketch the tweak in the browser (never the repo) and
  capture before/after; offer variants on taste calls
- **Phase 5 (HTML on request):** A comparison report with screenshots embedded inline (base64 — no
  drag-and-drop), a *why-it's-better* line per idea, and the diff to apply; can publish to
  [flypod.dev](https://flypod.dev) with report-specific permission

**Full run** works here too: variants get prototyped and shipped into the report labeled
A/B/C with a recommendation instead of waiting on a preference, and if nothing is serving the
UI it degrades to a text review and says so rather than stopping.

- **Evidence probes (optional):** One batch per UI slice over [`agent-browser`](https://github.com/vercel-labs/agent-browser)
  — axe-core on the changed subtree, computed CSS vs the design tokens, the actual XHR payload,
  and React render counts. Measures the lens claims that are otherwise just assertions about
  runtime behavior. Skips cleanly when the CLI isn't installed.

## Adding a skill

The [focused eval pilot](./evals/README.md) provides eight offline decision cases for `implement-slices` and `lean-pr-review`, separate from deterministic manifest and size checks.

```
skills/skill-name/
├── SKILL.md              # Required — frontmatter + instructions
└── reference/            # Optional — templates, checklists, examples
```

Add the directory under `skills/` — any folder there with a `SKILL.md` is discovered automatically, so there's no install list to maintain.

Keep `SKILL.md` at or under 8,000 bytes: Codex drops everything past that. Move detail that's only needed at one step into `reference/` and say in `SKILL.md` when to read it. `node scripts/check-skill-sizes.mjs` fails on any file over the limit. Consumers pick it up with `npx skills add teallarson/skills` (or `npx skills update` if they already have the repo installed).

Before a plugin update, run:

```bash
node scripts/check-manifests.mjs
node scripts/check-skill-sizes.mjs
```

Update the version and description consistently in all four manifests, then use the repository's PR workflow. This repository currently has no release tags or automated release job; merged source and manifest versions are what existing Git-based installs consume. Client updates and new sessions are separate from merging a PR.

## License

MIT — use freely, attribution appreciated.
