---
name: evaluate-agent-workflow
description: >-
  Evaluate the shape of an agent workflow — how work is split across nodes,
  edges, state, and gates — and decide whether the structure is worth what it
  costs. Use when reviewing a multi-agent setup, an orchestration script, a
  LangGraph/DAG workflow, a set of subagents, or a proposed design that fans
  out across several agents. Also use when a workflow is slow, expensive,
  flaky, or hard to debug, or when deciding whether to split one agent into
  many. For reviewing a single agent or skill's prompt, tools, and token
  efficiency, use agent-reviewer instead.
---

# Evaluate Agent Workflow

Evaluate the **topology** of an agent system: which nodes exist, which transitions are allowed, what state moves between them, and where the system stops for verification or a human.

This is a different question from whether any one agent is well written. `agent-reviewer` grades a node. This skill grades the graph the nodes sit in — and, first, whether there should be a graph at all.

Sister skills: `agent-reviewer` (single agent/skill quality), `lean-pr-review` (code review of the diff that implements it).

## When to Use

- Reviewing a multi-agent setup, orchestration script, or workflow graph
- Deciding whether to split one agent into several, or collapse several into one
- A workflow is slow, expensive, flaky, or nobody can explain why a run did what it did
- A new orchestration design is proposed and hasn't been built yet
- Auditing a `.claude/agents/` directory or a set of subagent definitions for routing that doesn't hold together

Skip for a single agent doing a single job with no fan-out — run `agent-reviewer` on it instead.

## Terminology note

"Graph engineering" is used for two unrelated things. This skill is about the **execution graph** — how the system runs. It is not about **knowledge graphs** — how the system stores what it knows. If the thing under review is a retrieval or memory structure, this skill does not apply.

## Workflow

### 0. Gate: does this need a graph at all?

Run this before anything else. It is the finding most likely to matter and the one most often skipped.

State the **single-loop baseline**: one model, one good system prompt, tools in a loop. Then name what the proposed structure buys over that baseline. Structure has to be paid for in infrastructure, testing surface, versioning pain, join latency, and parallel model spend.

Structure is justified when at least one of these is true and named concretely:

- **Parallel fan-out with a join** — independent work that genuinely runs concurrently, with a defined merge
- **Verification separated from generation** — the checker needs a context the generator can't see
- **Per-step audit or cost attribution** — someone has to defend or bill a specific step
- **Approval gates** — an irreversible or expensive action needs a human before it fires
- **Heterogeneous components** — services, languages, or trust boundaries that can't collapse into one prompt

Structure is *not* justified by: the diagram looks organized, the roles map to a team's org chart, or it feels more capable to have several specialists.

Watch specifically for **procedural work** — a defined sequence of steps with a known order. There's decent evidence that a single well-prompted model matches or beats an orchestrated setup on those, at lower latency and complexity. If the workflow is procedural and none of the five justifications hold, the finding is "collapse this," and the rest of the audit is optional.

Record the verdict explicitly before continuing. Everything below assumes the graph earned its place.

### 1. Draw the actual graph

Write out the nodes and edges as they exist, not as the docs or the diagram claim.

- Enumerate every node with its type: **agent loop**, **deterministic function**, **router**, **join**, **tool call**, **human checkpoint**.
- Enumerate every edge and what triggers it: unconditional, conditional (on what), retry, error, loop-back, approval.
- Mark the difference between the **declared** topology and the **runtime** topology. If workers are spawned dynamically, the runtime graph is the one that matters and the static picture is a lie of omission.

If you can't produce this from the source in a reasonable pass, that is itself the top finding — a topology nobody can read is a topology nobody can debug.

### 2. Node audit

For each node:

- **Does it need a model?** Deterministic logic should stay deterministic. An LLM call doing string formatting, routing on a known enum, or arithmetic is pure cost and variance.
- **Is there a contract?** Named inputs, named outputs, timeout, retry policy, and an owner. A node without a declared output shape can't be tested in isolation.
- **Is the context isolated?** Each node should see the slice of state it needs, not the whole transcript. Passing everything everywhere is the most common source of token bloat in a graph.
- **Is the node the right size?** A node that does five unrelated things is a graph hiding inside a node. A node that does one trivial thing is graph overhead with no payoff.
- **Is it idempotent?** If it can be retried or replayed — and checkpointing means it can — running it twice must not double-charge, double-send, or double-write.

### 3. Edge audit

- **Fake edges.** An arrow that carries no work or data is decoration. Remove it or say what flows across it.
- **Guards in code, not in prose.** Hard constraints ("never touch prod", "stop after 3 revisions", "only escalate above $500") belong in routing logic. A constraint that lives only in a prompt is a suggestion.
- **Error classification.** Every failure edge should distinguish retryable from terminal. A blanket retry on a terminal error burns budget; a blanket abort on a transient one burns trust.
- **Loop bounds.** Every cycle needs a stop condition — max iterations, a measurable improvement threshold, or a budget. Evaluator-optimizer loops without a revision cap are the classic runaway.
- **Reachability.** Any node with no inbound edge, or a router branch that can't be selected, is dead. Any node with no outbound edge that isn't terminal is a hang.

### 4. State audit

- **Typed and explicit.** State should be a declared record, not an accumulating blob of messages.
- **Reducers for concurrent writes.** If two branches write the same key, there must be a stated merge rule. Last-write-wins across parallel branches is silent data loss.
- **Growth.** Does state grow unbounded across a long run? Find where it's trimmed.
- **Ownership.** For each key, which node writes it and which read it. Keys written by everyone and read by no one are residue.

### 5. Parallelism audit

- **Real independence.** Branches must not need each other's output. If one branch quietly depends on another, parallel execution is a race, not a speedup.
- **Join cost.** The join is as slow as the slowest branch and as expensive as all of them together. Confirm the latency win is real and worth the multiplied model spend.
- **Partial failure.** What happens when three of five branches succeed? Every join needs an answer.
- **Fan-out width.** Is it bounded? A dynamic spawn with no cap is an unbounded bill.

### 6. Recovery and human gates

- **Checkpoints.** Can a run resume after a crash, and from where? In-memory-only checkpointing loses everything on restart — fine for a demo, not for anything long-running.
- **Replay.** Can you re-run a past execution to reproduce a bug? If not, incident response means guessing.
- **Interrupts.** Where does the system pause for input, and does the pause happen *before* the consequential action rather than after?
- **Gate placement.** Human approval should be risk-based, concentrated where a mistake is expensive or irreversible. Blanket approval on every step trains people to click through, which is worse than no gate because it looks like control.

### 7. Observability

- **Stable identifiers.** Every step should carry a graph id, run id, and node id, propagated through to tool and model calls.
- **Correlation.** Orchestrator state and gateway/model traces have to join on those ids, or you have two half-stories.
- **Per-step cost and latency.** Attributed to a node, not just totaled per run. Without this you can't find the expensive node.
- **Decision capture.** Routes taken, guards fired, and human decisions should be recorded, not just final output.

### 8. Rigidity check (the inverse failure)

Structure can also be wrong in the other direction. Look for:

- **A frozen node that should be a loop.** Emergent, open-ended work — research, exploratory debugging, anything where the next step depends on what the last one found — resists a predefined path. A node holding a full agent loop is a legitimate node; forcing that work into fixed steps produces a workflow that fails whenever reality deviates.
- **No self-correction path.** If a failed step can only fail forward, the graph is a DAG pretending to be an agent system. Production runs need to revisit, retry, and repair.
- **Static topology for variable input.** If the number of workers depends on the input, the graph should spawn them at runtime rather than hardcoding a fixed set.

The shape that holds up in practice is mixed: deterministic edges and guards around the outside, model judgment inside the nodes that need it.

## Anti-patterns

| Pattern | Why it fails |
|---|---|
| Boxes for their own sake | Cost, latency, and testing surface with no safety or speed gained |
| Roles mirroring an org chart | Team structure isn't a dependency graph |
| Constraint written in a prompt | Not enforced; the model can talk itself past it |
| LLM node doing deterministic work | Variance and spend where a function would do |
| Unbounded loop or unbounded fan-out | Runaway cost with no natural stop |
| Parallel branches sharing state without reducers | Silent overwrite |
| Approval on every step | Rubber-stamping; looks like governance, isn't |
| Fixed steps around emergent work | Breaks the moment the task doesn't go as drawn |
| No per-node cost or trace | Can't find the expensive or broken node |

## Output

Lead with the verdict, then the findings.

**Verdict** — one of:

- **Collapse** — the structure doesn't pay for itself; state what it should become (usually a single loop, or fewer nodes) and what would have to change for the graph to be worth it later.
- **Keep with fixes** — the shape is right; the listed findings are what's wrong inside it.
- **Add structure** — currently one loop, but one or more of the five justifications applies; name which, and the minimum structure that covers it.

**Findings** — ordered by what would bite first in production. For each:

- What the workflow does today, concretely, naming the node or edge
- What happens as a result — the failure, the cost, the debugging dead end
- The specific change

Cap at the findings that would change a decision. A list of thirty observations is a way of having no opinion.

## Where this comes from

Grounding for the checks above, if a claim needs to be re-verified:

- [Is Graph Engineering Real?](https://www.turingpost.com/p/is-graph-engineering-real-why-everyone-is-talking-about-it) — the skeptical case; a loop is already a graph
- [3 Years of Graph Engineering with LangGraph](https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph) — the rigidity lesson and the shift to agent loops inside nodes
- [Graph Engineering for Multi-Agent Systems](https://www.truefoundry.com/blog/graph-engineering-enterprise-guide) — node/edge taxonomy, identifier propagation, observability
- [Graph Engineering for AI Agents (LangGraph guide)](https://www.analyticsvidhya.com/blog/2026/07/graph-engineering/) — state, reducers, checkpoints, interrupts, node contracts
- [In-Context Prompting Obsoletes Agent Orchestration for Procedural Tasks](https://arxiv.org/pdf/2604.27891) — the procedural-task finding behind step 0
- [From Static Templates to Dynamic Runtime Graphs](https://arxiv.org/abs/2603.22386) — survey of static vs. runtime-generated topology
- [Agint: Agentic Graph Compilation](https://arxiv.org/pdf/2511.19635) — compiled rather than hand-authored graphs
