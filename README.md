# skills

Agent skills for [Cursor](https://cursor.com/docs/agent/skills) and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — reusable workflows for planning, review, and skill development.

Each skill is a directory with a `SKILL.md` file. Drop it into your personal skills folder (or symlink from this repo) and invoke it with `/skill-name`.

## Install

```bash
git clone https://github.com/teallarson/skills.git ~/skills
```

### Cursor

Personal skills live in `~/.cursor/skills/`:

```bash
ln -s ~/skills/lean-pr-review ~/.cursor/skills/lean-pr-review
ln -s ~/skills/lean-pr-review-visual ~/.cursor/skills/lean-pr-review-visual
ln -s ~/skills/ooda-plan ~/.cursor/skills/ooda-plan
ln -s ~/skills/slice-plan ~/.cursor/skills/slice-plan
ln -s ~/skills/agent-reviewer ~/.cursor/skills/agent-reviewer
```

Project-scoped skills go in `.cursor/skills/` at the repo root.

### Claude Code

Personal skills live in `~/.claude/skills/`:

```bash
ln -s ~/skills/lean-pr-review ~/.claude/skills/lean-pr-review
ln -s ~/skills/lean-pr-review-visual ~/.claude/skills/lean-pr-review-visual
ln -s ~/skills/ooda-plan ~/.claude/skills/ooda-plan
ln -s ~/skills/slice-plan ~/.claude/skills/slice-plan
ln -s ~/skills/agent-reviewer ~/.claude/skills/agent-reviewer
```

Project-scoped skills go in `.claude/skills/` at the repo root.

Start a new agent session after installing so skills are picked up.

## Skills

| Skill | Invoke | What it does |
|-------|--------|--------------|
| [ooda-plan](./ooda-plan/) | `/ooda-plan` | Write a fresh implementation plan as vertical slices with OODA loops and testable acceptance criteria |
| [slice-plan](./slice-plan/) | `/slice-plan` | Reshape an existing horizontal plan into vertical slices |
| [lean-pr-review](./lean-pr-review/) | `/lean-pr-review` | Walk a PR slice-by-slice; challenge complexity; ship a flypod-ready HTML review |
| [lean-pr-review-visual](./lean-pr-review-visual/) | `/lean-pr-review-visual` | lean-pr-review + live before/after visual tweaks (chrome-devtools) for UI PRs |
| [agent-reviewer](./agent-reviewer/) | `/agent-reviewer` | Review agents and skills for discoverability, structure, and token efficiency |

> `lean-pr-review-visual` reuses `lean-pr-review`'s shared references (lenses, bugs, tone), so keep both installed side-by-side.

## Workflow

```
ooda-plan               →  how do we build this incrementally?
slice-plan              →  fix a plan that's gone horizontal
lean-pr-review          →  does every change earn its keep?
lean-pr-review-visual   →  …and does the UI look right? (before/after)
agent-reviewer          →  are our skills any good?
```

### lean-pr-review

Sequential, conversational, gate-driven — the opposite of batch review.

- **Phase 0–2:** Lock scope, map territory, check intent vs. diff
- **Phase 3:** One slice at a time with earn-your-keep lenses
- **Phase 4:** Synthesis and ship verdict
- **Phase 5:** Standalone HTML report ([flypod.dev](https://flypod.dev)-ready)

**Example output:** [flypod review](https://9b04968f857642fd.flypod.dev/)

### lean-pr-review-visual

Everything `lean-pr-review` does, plus a **live visual pass** for UI slices. Prototype
polish in a real browser with the chrome-devtools MCP — inject CSS, capture before/after
at readable zoom, propose the exact class/style diff. Works against Storybook, a dev
server, or a deploy preview.

- **Phase 3e:** For each UI slice, sketch the tweak in the browser (never the repo) and
  capture before/after; offer variants on taste calls
- **Phase 5:** A comparison report with screenshots embedded inline (base64 — no
  drag-and-drop), a *why-it's-better* line per idea, and the diff to apply; ships to
  [flypod.dev](https://flypod.dev) from the CLI

## Adding a skill

```
skill-name/
├── SKILL.md              # Required — frontmatter + instructions
└── reference/            # Optional — templates, checklists, examples
```

Copy or symlink the directory into `~/.cursor/skills/` and/or `~/.claude/skills/`.

## License

MIT — use freely, attribution appreciated.
