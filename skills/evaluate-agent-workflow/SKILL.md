---
name: evaluate-agent-workflow
description: >-
  Judge a multi-agent workflow's structure (nodes, edges, state, gates) and
  whether it is worth its cost. Use when reviewing a multi-agent setup,
  orchestration script, LangGraph/DAG, or subagents; when a workflow is
  slow, expensive, flaky, or hard to debug; or when deciding to split
  one agent into many. For one agent or skill, use agent-reviewer.
---

# Evaluate Agent Workflow

Judge the execution graph of an agent system: which nodes exist, which transitions are allowed, what state moves between them, and where it stops for a check or a human. First decide whether there should be a graph at all.

For a single agent doing one job with no fan-out, use [agent-reviewer](../agent-reviewer/SKILL.md) instead. This skill does not apply to knowledge graphs or other retrieval and memory structures.

## Steps

### 0. Does this need a graph?

State the single-loop baseline: one model, one system prompt, tools in a loop. Then name what the structure buys over that baseline. Structure costs infrastructure, test surface, versioning, join latency, and parallel model spend.

Structure is justified only by one of these, named concretely:

- Parallel fan-out with a defined join, over work that is truly independent
- Verification separated from generation, because the checker needs context the generator can't see
- Per-step audit or cost attribution that someone has to defend or bill
- An approval gate before an irreversible or expensive action
- Components that can't collapse into one prompt: separate services, languages, or trust boundaries

A tidy diagram, roles that match a team's org chart, or a sense that more specialists means more capability do not count.

If the work is procedural (known steps in a known order) and none of the five hold, the verdict is Collapse and the remaining steps are optional. A single well-prompted model matches or beats orchestration on procedural tasks at lower latency ([source](https://arxiv.org/pdf/2604.27891)).

Record this verdict before continuing.

### 1. Draw the actual graph

Work from the source, not the docs or diagram:

- Every node and its type: agent loop, deterministic function, router, join, tool call, human checkpoint.
- Every edge and its trigger: unconditional, conditional (on what), retry, error, loop-back, approval.
- Where the runtime graph differs from the declared one. If workers spawn dynamically, review the runtime graph.

If you can't produce this in a reasonable pass, report that as the top finding.

### 2. Nodes

- Deterministic work (formatting, routing on a known enum, arithmetic) is done by code, not a model call.
- Each node has named inputs and outputs, a timeout, a retry policy, and an owner.
- Each node sees only the state it needs, not the whole transcript.
- Each node does one coherent job. Split a node doing several unrelated jobs; merge a trivial one into a neighbor.
- A retry or replay does not double-charge, double-send, or double-write.

### 3. Edges

- Every edge carries work or data. Remove the ones that don't, or name what flows.
- Hard constraints (never touch prod, stop after 3 revisions, escalate above $500) are enforced in routing code. A constraint that is only in a prompt is not enforced.
- Failure edges separate retryable from terminal errors.
- Every cycle has a stop condition: max iterations, an improvement threshold, or a budget. Check evaluator-optimizer loops for a revision cap.
- No node or router branch is unreachable. Every node without an outbound edge is terminal; otherwise it hangs.

### 4. State

- State is a declared, typed record, not a growing list of messages.
- Keys written by parallel branches have a stated merge rule. Last-write-wins across branches loses data.
- Find where state is trimmed on long runs.
- For each key, list its writer and readers. Flag keys nobody reads.

### 5. Parallelism

- Branches don't depend on each other's output. If one does, the parallel run is a race.
- The join waits for the slowest branch and pays for all of them. Confirm the latency gain is worth the spend.
- Each join defines what happens when only some branches succeed.
- Fan-out width is capped.

### 6. Recovery and human gates

- A run can resume after a crash; say from where. In-memory checkpoints don't survive a restart.
- A past run can be replayed to reproduce a bug.
- Pauses for input happen before the consequential action.
- Approval gates sit where a mistake is expensive or irreversible. Flag approval on every step: people learn to click through it.

### 7. Observability

- Every step carries graph, run, and node ids, passed through to tool and model calls.
- Orchestrator state and model or gateway traces can be joined on those ids.
- Cost and latency are recorded per node, not only per run.
- Routes taken, guards fired, and human decisions are recorded.

### 8. Too rigid

- Open-ended work (research, exploratory debugging, anything where the next step depends on the last result) runs as an agent loop inside one node, not as fixed steps.
- A failed step can be retried or repaired, not only passed forward.
- If the number of workers depends on the input, they are spawned at runtime.

Recommend deterministic edges and guards around the outside, with model judgment only inside the nodes that need it.

## Output

Lead with the verdict:

- **Collapse**: the structure doesn't pay for itself. Say what it should become (usually one loop or fewer nodes) and what would have to change for a graph to be worth it later.
- **Keep with fixes**: the structure is right; the findings are problems inside it.
- **Add structure**: currently one loop, but a step 0 justification applies. Name which, and the smallest structure that covers it.

Then the findings, ordered by what would fail first in production. For each:

- What the workflow does today, naming the node or edge
- What happens as a result: the failure, the cost, or what can't be debugged
- The specific change

Include only findings that would change a decision.
