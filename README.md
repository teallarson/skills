# skills

Agent skills for [Cursor](https://cursor.com/docs/agent/skills) and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — reusable workflows for code review, planning, and development.

Each skill is a directory with a `SKILL.md` file. Drop it into your personal skills folder (or symlink from this repo) and invoke it with `/skill-name`.

## Install

```bash
git clone https://github.com/teallarson/skills.git ~/skills
```

### Cursor

Personal skills live in `~/.cursor/skills/`:

```bash
ln -s ~/skills/lean-pr-review ~/.cursor/skills/lean-pr-review
```

Project-scoped skills go in `.cursor/skills/` at the repo root.

### Claude Code

Personal skills live in `~/.claude/skills/`:

```bash
ln -s ~/skills/lean-pr-review ~/.claude/skills/lean-pr-review
```

Project-scoped skills go in `.claude/skills/` at the repo root.

Start a new agent session after installing so skills are picked up.

## Skills

| Skill | Invoke | What it does |
|-------|--------|--------------|
| [lean-pr-review](./lean-pr-review/) | `/lean-pr-review` | Walk a PR slice-by-slice until every change is understood. Challenge complexity that doesn't earn its keep. Ends with a polished HTML review artifact. |

## lean-pr-review

The opposite of batch/automated review. **Sequential, conversational, gate-driven.**

- **Phase 0–2:** Lock scope, map territory by concern, check intent vs. diff
- **Phase 3:** One slice at a time — explain, apply earn-your-keep lenses, pause for discussion
- **Phase 4:** Synthesis and ship verdict
- **Phase 5:** Standalone HTML report ([flypod.dev](https://flypod.dev)-ready)

**Example output:** [flypod review](https://9b04968f857642fd.flypod.dev/)

**Optional:** If you have an `impeccable` skill installed, run `/impeccable polish` on the generated HTML for final craft.

## Adding a skill

```
skill-name/
├── SKILL.md              # Required — frontmatter + instructions
└── reference/            # Optional — templates, checklists, examples
```

Copy or symlink the directory into `~/.cursor/skills/` and/or `~/.claude/skills/`.

## License

MIT — use freely, attribution appreciated.
