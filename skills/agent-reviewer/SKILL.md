---
name: agent-reviewer
description: >-
  Review one AI agent (subagent) or agent skill for Cursor or Claude Code:
  prompt quality, tool design, context and token use, progressive disclosure,
  and discoverability. Use after creating or changing an agent or skill, before
  publishing one, when it performs worse or uses too many tokens, or when a
  skill isn't loaded when it should be.
---

# Agent Reviewer

Reviews a single agent or skill. For how several agents are split, routed, and joined, use [evaluate-agent-workflow](../evaluate-agent-workflow/SKILL.md).

Skills live in `~/.cursor/skills/`, `~/.claude/skills/`, or a project's `.cursor/skills/` or `.claude/skills/`.

## Process

1. **Identify the type.** An agent runs its own loop (gather context, act, verify, repeat), holds tool definitions, and is usually spawned as a subagent. A skill is a `SKILL.md` with `name` and `description` frontmatter, often invoked as a slash command, sometimes with supporting files.
2. **Read for intent**: purpose, triggers, core workflow.
3. **Walk the matching checklist below.** Cite the exact line or section for each finding.
4. **Write the review** in the output format. Put high-impact, low-effort fixes first, show before/after text for each fix, and note what already works.

## Agent checklist

**Prompt**

- Clear, unambiguous language in distinct sections.
- Only the instructions it needs. No repeated instructions.
- Gives the goal and the key rules without scripting every case.
- 2–3 varied, typical examples that show the output format and the key decisions.

**Tools**

- The fewest tools that cover the job, with no overlap between them.
- Descriptive parameter names and usage guidance in each description.
- Results are compact and actionable. Errors are handled.

**Loop and context**

- Each phase is defined: what context it gathers, which tools act, what checks verify the work, when to repeat or stop.
- Context strategy fits the task length: compaction for long tasks, subagents where they help.
- One focused purpose, with clear handoff points to other agents.

**Errors and verification**

- Handles missing information, with fallbacks and useful error messages.
- Checks its own work against measurable success criteria.

## Skill checklist

**Discoverability**

- `name` is short, kebab-case, easy to type, and neither too generic nor too narrow.
- `description` says what the skill does and when to use it, including phrases a user would actually say. Test it against realistic requests.
- `disable-model-invocation: true` is set when the skill should run only on an explicit `/invoke`.

**Progressive disclosure**

- Frontmatter holds only name, description, and optional flags.
- `SKILL.md` is at most 8,000 bytes; Codex drops everything past that.
- `SKILL.md` holds only what every run needs. Long references, templates, and mutually exclusive branches live in separate files, and `SKILL.md` says when to read each one.
- Executable code lives in scripts, not inline.

**Instructions**

- Clear purpose and step-by-step, actionable instructions with clear success criteria.
- Examples match common cases.
- States what it needs without assuming prior knowledge. Handles edge cases or says they are out of scope.
- Names related skills and optional tools it integrates with.

**Portability**

- No hardcoded repo, org, or internal tooling.
- Detects or asks for the base branch, paths, and integrations, or documents what to configure.

**Scope**

- One purpose, with clear entry and exit points and no overlap with other installed skills.

**By pattern**

- Workflow skill: clear order of steps, defined checkpoints or gates (especially in conversational skills), verification steps.
- Reference skill: well organized, details split out.
- Template skill: complete templates with fill-in guidance and an example of the output.

## Output format

```markdown
# [Agent|Skill] Review: [Name]

## Overall assessment
[Strengths and main areas to improve]

## Findings
### [Section]
**Strengths:** ...
**Issues:** ...
**Recommendations:** ...

## Priority improvements
1. [Highest impact]
2. ...

## Discoverability (skills only)
[Excellent / Good / Needs improvement]: [will the agent load it when needed?]

## Token efficiency
[Efficient / Moderate / Needs improvement]: [reason]

## Next steps
- [ ] ...
```

Sections: for agents, Prompt, Tools, Loop and verification. For skills, Discoverability, Progressive disclosure, Instructions, Portability.
