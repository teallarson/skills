---
name: agent-reviewer
description: >-
  Reviews AI agents (autonomous subagents) and agent skills for Cursor and
  Claude Code. Evaluates prompt quality, tool design, context efficiency,
  progressive disclosure, and discoverability. Provides specific, actionable
  feedback. Use after creating or modifying an agent or skill, when performance
  degrades, or when a skill isn't being found when it should be.
---

# Agent Reviewer

Systematically review:

- **Autonomous agents** — systems with gather → act → verify → repeat loops, often spawned as subagents
- **Agent skills** — slash-command workflows with YAML frontmatter and progressive disclosure

Works with skills in `~/.cursor/skills/`, `~/.claude/skills/`, or project-scoped `.cursor/skills/` / `.claude/skills/`.

## When to Use

- After creating a new agent or skill
- When an agent or skill shows degraded performance
- Before sharing or publishing a skill
- During iterative agent/skill development
- When agents/skills consume too many tokens
- After observing failure modes in testing
- When discoverability is poor (skills not being loaded when they should)

## First Step: Identify What You're Reviewing

**Is this an AGENT or a SKILL?**

**Agent indicators:**

- Has autonomous operation with feedback loops
- Contains tool definitions and orchestration logic
- Makes independent decisions
- Has its own context window (subagent)
- Spawned via a subagent/task mechanism

**Skill indicators:**

- Has YAML frontmatter with `name` and `description`
- Located in a skills directory (`SKILL.md` at the skill root)
- Provides instructions, templates, or reference material
- Uses progressive disclosure (core + supplementary files)
- Invoked via slash command (e.g. `/lean-pr-review`)

→ Once identified, apply the appropriate review framework below.

## Review Framework for Agents

### 1. Context Engineering

**Prompt clarity**

- [ ] Clear, direct language (no ambiguity)
- [ ] Organized into distinct sections
- [ ] Maintains "right altitude" (not too specific, not too vague)
- [ ] Minimal instructions (only what's needed)

**Examples quality**

- [ ] 2–3 diverse canonical examples
- [ ] Representative, not edge-case focused
- [ ] Shows desired output format clearly
- [ ] Demonstrates key decision points

**Token efficiency**

- [ ] High signal-to-noise ratio
- [ ] No redundant instructions
- [ ] Concise but complete
- [ ] Appropriate for task complexity

### 2. Tool Design

**Composition**

- [ ] Minimal necessary tools
- [ ] No overlapping functionality
- [ ] Each tool has a clear, distinct purpose
- [ ] Tools work together cohesively

**Interface**

- [ ] Parameter names are descriptive and unambiguous
- [ ] Returns token-efficient data
- [ ] Usage guidance in descriptions

**Behavior**

- [ ] Encourages efficient patterns
- [ ] Provides actionable results
- [ ] Handles errors gracefully

### 3. Agent Architecture

**Task cycle**

- [ ] Gather Context phase is well-defined
- [ ] Take Action phase has clear tools
- [ ] Verify Work phase includes checks
- [ ] Repeat logic is appropriate

**Context management**

- [ ] Appropriate strategy for task duration
- [ ] Compaction for long-horizon tasks when needed
- [ ] Subagents used when beneficial

**Specialization**

- [ ] Focused purpose — doesn't try to do too much
- [ ] Clear handoff points to other agents

### 4. Error Handling & Verification

- [ ] Handles missing information gracefully
- [ ] Helpful error messages and fallback behaviors
- [ ] Self-checks its work with measurable success criteria
- [ ] Failure modes anticipated

## Review Framework for Skills

### 1. Discoverability

**Metadata**

- [ ] `name` is short, clear, kebab-case
- [ ] `description` states what the skill does **and** when to use it
- [ ] Description includes trigger phrases the user might say
- [ ] Name and description work together — the agent would load this skill when needed
- [ ] `disable-model-invocation: true` set when the skill should only run on explicit `/invoke` (Cursor)

**Naming**

- [ ] Suggests functionality without being too generic or too narrow
- [ ] Easy to remember and type

### 2. Progressive Disclosure

**Structure**

- [ ] Proper YAML frontmatter
- [ ] Core `SKILL.md` is focused and concise
- [ ] Supplementary files (`reference/`, templates) used appropriately
- [ ] File organization is intuitive

**Information hierarchy**

- [ ] Frontmatter contains just name + description (+ optional flags)
- [ ] Core content has essential information only
- [ ] Detailed references separated into other files
- [ ] Mutually exclusive contexts are split

**Loading efficiency**

- [ ] Doesn't load unnecessary information upfront
- [ ] References to supplementary files are clear
- [ ] Executable code lives in scripts, not inline in context
- [ ] Token usage is optimized

### 3. Instruction Quality

**Clarity**

- [ ] Purpose statement is clear
- [ ] "When to use" section is specific
- [ ] Instructions are step-by-step
- [ ] Examples are helpful and representative

**Completeness**

- [ ] Necessary information included without assuming prior knowledge
- [ ] Edge cases addressed or explicitly scoped out
- [ ] Integration points documented (related skills, optional tools)

**Usability**

- [ ] Steps are actionable
- [ ] Success criteria are clear
- [ ] Examples match common use cases

### 4. Portability

- [ ] No hardcoded references to a specific repo, org, or internal tooling
- [ ] Base branch, paths, and integrations detected or asked — not assumed
- [ ] Works on any project without editing (or documents what to configure)

### 5. Context Efficiency & Scope

- [ ] Single focused purpose
- [ ] Doesn't overlap with other skills in the same install
- [ ] Clear boundaries and entry/exit points
- [ ] Examples over exhaustive rules

### 6. Skill Patterns

**Workflow skills**

- [ ] Linear progression is clear
- [ ] Checkpoints and gates defined (especially conversational skills)
- [ ] Verification steps included

**Reference skills**

- [ ] Information well-organized
- [ ] Details progressively disclosed

**Template skills**

- [ ] Templates are clear and complete
- [ ] Fill-in guidance and example output provided

## Review Process

1. **Identify type** — agent or skill
2. **Understand intent** — read purpose, when-to-use, and core workflow
3. **Analyze structure** — tools/loops for agents; disclosure/file layout for skills
4. **Evaluate efficiency** — token usage, discoverability, scope
5. **Check systematically** — walk the appropriate checklist above; cite exact locations
6. **Give actionable feedback** — concrete suggestions with examples; prioritize high-impact fixes

## Common Issues

| Issue | Symptoms | Fix |
| --- | --- | --- |
| Overly verbose prompts | High tokens, no performance gain | Distill to essentials; examples over rules |
| Overlapping tools/skills | Confusion about which to use | Consolidate or define clear boundaries |
| Missing context | Frequent failures or clarification requests | Add background, examples, tool descriptions |
| Brittle instructions | Happy path only | Raise altitude — principle-based, flexible |
| Poor discoverability | Skill never loads when needed | Improve description triggers; test phrasing |
| No progressive disclosure | One huge SKILL.md | Split into core + reference files |
| Vague instructions | Agent skips steps or asks constantly | Explicit steps, edge cases, examples |
| Repo-specific assumptions | Breaks outside one project | Detect, ask, or document configuration |
| Scope creep | Skill tries to do unrelated things | Split or defer to related skills |

## Output Format

### Agent review

```markdown
# Agent Review: [Name]

## Type
**Agent** (autonomous subagent)

## Overall Assessment
[Strengths and main areas for improvement]

## Detailed Findings

### Context Engineering
**Strengths:** ...
**Issues:** ...
**Recommendations:** ...

### Tool Design
...

### Architecture & Verification
...

## Priority Improvements
1. [Highest impact]
2. ...
3. ...

## Token Efficiency
[Efficient / Moderate / Needs Improvement] — [justification]

## Next Steps
- [ ] ...
```

### Skill review

```markdown
# Skill Review: [Name]

## Type
**Skill** (agent skill)

## Overall Assessment
[Strengths and main areas for improvement]

## Detailed Findings

### Discoverability
**Strengths:** ...
**Issues:** ...
**Recommendations:** ...

### Progressive Disclosure
...

### Instruction Quality
...

### Portability
...

## Priority Improvements
1. [Highest impact]
2. ...
3. ...

## Discoverability
[Excellent / Good / Needs Improvement] — [will the agent load this when needed?]

## Token Efficiency
[Efficient / Moderate / Needs Improvement] — [justification]

## Next Steps
- [ ] ...
```

## Review Best Practices

- **Be specific** — cite lines/sections; show before/after
- **Be constructive** — acknowledge what works; suggest alternatives
- **Be practical** — prioritize high-impact, low-effort improvements
- **Be thorough** — check all sections; don't assume

## Creation → Review Cycle

1. Draft the agent or skill
2. Run `/agent-reviewer` on it
3. Iterate based on feedback
4. Re-review after significant changes
5. Test discoverability with realistic user phrasing

## Related skills in this repo

- **ooda-plan** / **slice-plan** — examples of well-structured workflow skills
- **lean-pr-review** — example of gate-driven conversational workflow with reference files
