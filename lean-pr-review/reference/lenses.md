# Earn-Your-Keep Lenses

Apply every lens to each slice. Skip a lens only when clearly N/A — say why.

## Necessity

> Would the PR work without this change?

- Dead code, unused imports, commented-out blocks
- Abstractions used once
- Config/env changes nothing reads
- Dependencies added but unused
- Re-exports that add no value

## Simplicity

> Is there a smaller diff that achieves the same outcome?

- Wrapper functions that only call one thing
- Extra indirection (interface → impl → adapter for one consumer)
- Generic solutions for a single use case
- Framework/library introduced for one call site
- Refactors mixed into feature work (could be separate PR?)

## Locality

> Does this belong in this file, layer, or abstraction?

- Business logic in UI components
- HTTP concerns in domain layer
- Shared util that's only used in one place
- Cross-cutting change duplicated instead of centralized once
- Test helpers in production code paths

## Proportionality

> Is the complexity proportional to the problem?

- 200 lines for a 5-line behavior change
- New state machine for two states
- Caching layer before proving a perf problem
- Error handling more complex than the happy path
- Types/interfaces more elaborate than the data they model

## Pattern fit

> Does this match existing conventions, or introduce a new pattern unnecessarily?

- Different error handling style than surrounding code
- New testing pattern (fixtures, mocks) unlike rest of suite
- Different naming conventions
- New folder structure for one file
- Library already in repo solves this (reinventing)

## Test worth

> Does this test prove something the code doesn't already guarantee?

**Red flags:**
- Tests implementation details (private methods, internal state shape)
- Mocks the entire stack — asserts the mock was called, not behavior
- Duplicate coverage (unit + integration testing same path identically)
- Snapshot of generated/boilerplate output
- Test file larger than source with low assertion value
- "Happy path only" when edge cases are the actual risk

**Green flags:**
- Tests behavior a user or caller cares about
- Would fail if the requirement regressed
- Covers the edge case that motivated the change
- Proportional setup — minimal fixtures

## Scope discipline

> Is this change in service of the PR's stated intent?

- Drive-by formatting unrelated to the feature
- Renames outside the touched surface
- "While I'm here" improvements
- Version bumps unrelated to the change
- Deleted code with no explanation

## Readability

> Will the next reader understand this in 6 months without the PR author?

- Clever one-liners that obscure intent
- Abbreviated variable names in non-trivial logic
- Missing context for non-obvious decisions (when a one-line comment would help)
- Deep nesting that could flatten
- Magic numbers/strings without named constants (when it matters)

## Bugs & regressions

> What actually breaks at runtime?

**Always apply** — not optional, not deferred to synthesis. Use [bugs.md](bugs.md) for the full playbook.

- Trace happy path **and** empty, loading, stale, and misconfigured paths
- Read callers/consumers outside the diff when the slice changes a contract
- Race between async fetch and user action (persisted state, first paint, send)
- Wrong or empty defaults (`""`, null, fallback bypassing allowlist)
- UI gating mismatched to request payload (hidden control but field still sent, or vice versa)
- Regression: behavior on `main` that this PR could break
- Error paths: fail silent, fail late, fail confusing (runtime LLM error vs setup UX)

Classify each hit: **Bug**, **Likely bug**, **Footgun**, or **Not a bug** (with one-line why).

## Security (when applicable)

Trust-boundary focus — complements Bugs, doesn't replace it:

- Input validation at the right layer
- AuthZ checked where data is accessed, not just at the edge
- Secrets not logged or committed
- Allowlist bypass via alternate code path or omitted field

Don't perform a full security audit — flag and note "out of scope for lean review" when appropriate.

## How to record a finding

Each finding needs:

1. **File:line** (or file if whole-file concern)
2. **Lens** (which lens caught it)
3. **What** (one sentence)
4. **Why it matters** (one sentence)
5. **Suggestion** (concrete: delete, inline, move, simplify — not "consider refactoring")

Example:

```
apps/api/handler.go:42 — Simplicity
New `parseAndValidateRequest` wraps 3 lines. Inline at call site; no second caller.

hooks/use-model.ts:71 — Bugs (race)
Catalog fetch in-flight + empty `models` treats persisted id as dropped; request omits
`model`, server picks default. Repro: stored model in sessionStorage, hard refresh, send before /config/models returns.
```
