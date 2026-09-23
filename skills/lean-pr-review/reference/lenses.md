# Earn-Your-Keep Lenses

Apply every lens to each slice. Skip a lens only when clearly N/A — say why.

## Necessity

> Would the PR work without this change?

- Dead code, unused imports, commented-out blocks
- Abstractions used once
- Config/env changes nothing reads
- Dependencies added but unused
- Re-exports that add no value

## Synced vs. derived state

> Is this a second copy of a fact, kept in agreement by hand — or derived from its source?

Applies to **every slice, not just frontend**. The tell is a value that must be *written* to
stay correct. Synced copies drift; derived values can't. For each one, name the source of
truth out loud, then ask whether this is computable from it.

- Same constant, option list, or enum declared in two files — or twice in one file
- A field, column, or cache that must be updated whenever another one changes
- A flag that is a pure function of other fields (`isEmpty`, `hasError`, `count`, `status`)
- A type or schema hand-mirrored across a boundary (client copy of a server shape) instead of
  generated or imported from one definition
- One fact spread across env file, deploy config, and a code default — three places to forget
- A denormalized total with no invariant keeping it honest
- Two code paths that must stay behaviorally identical with nothing enforcing it

**When a copy is correct:** derivation is genuinely expensive (measured), or the copy is a
deliberate snapshot — an audit record, a historical price, a version pinned on purpose. That's
derive-then-freeze, not drift. Say so and move on. Otherwise: derive it and delete the copy.

React/TypeScript specifics (`useState` mirrors, effect-based sync, `form.reset`) are in
[frontend-idioms.md](frontend-idioms.md). A synced copy that can clobber user edits is 🐛, not 🧹.

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

## Overengineering / speculative generality

> Is this built for the requirement in hand, or for one nobody has asked for?

Proportionality asks whether the complexity fits the problem. This asks whether the problem is
real *yet*. The tell is machinery whose only justification is a future tense — "so we can
later…", "in case we need…", "makes it easy to add…".

- **Options nobody chose** — flag, prop, or config knob with the same value at every call site
- **Extension point with one implementation** — interface, registry, strategy map, plugin hook
- **Premature generality** — parameterized or generic where the second caller is hypothetical
- **Layers that only forward** — handler → service → repo → mapper where a hop makes no decision
- **Speculative resilience** — retry, circuit breaker, cache, or feature flag with no failure or
  measurement behind it
- **Defensive branches for impossible states** — null checks the type system already rules out,
  unreachable `default:` cases
- **Abstraction ahead of the pattern** — extracted a shared thing from one instance. Extract on
  the third, not the first
- **A framework for a function** — new dependency, DSL, or generator serving one call site

Ask the concrete version: *"What breaks if we delete this and add it back when we need it?"* If
the answer is "nothing, and adding it later is a small diff," it's overengineering.

**Counter-check — don't cry wolf.** Complexity is earned when there's a named current consumer,
a real failure it prevents, a measured cost it avoids, or a house convention it follows. When you
find one of those, credit it. "Simpler" that drops a behavior isn't simpler, and a reviewer who
flags every abstraction teaches the author to skim the review.

## Pattern fit

> Does this match existing conventions, or introduce a new pattern unnecessarily?

- Different error handling style than surrounding code
- New testing pattern (fixtures, mocks) unlike rest of suite
- Different naming conventions
- New folder structure for one file
- Library already in repo solves this (reinventing)

**Prior-art / reuse check — do this actively, don't wait to stumble on it.**
Before judging a non-trivial chunk, find how the codebase already solves this: the sibling
feature, a shared util, a design-system component, the reference files a `CLAUDE.md` / rules
doc points to (e.g. a `forms.md` naming the canonical form). Then check the PR against it:

- **Reinvented** — hand-rolled what a shared helper/component already does. Cite the existing one.
- **Copy-pasted** — duplicated a constant/type/pattern instead of importing it (drift risk).
- **Near-miss divergence** — followed the pattern but broke from it in one spot (different naming,
  a sibling does it cleaner). Point at the closest correct example.
- **Correct reuse** — credit it; it's evidence the change fits.

Look inside the changed files too, not just across them: the same option list declared twice,
or one control done the idiomatic way and its neighbor done by hand, is the same smell at
file scope.

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

## Framework idioms (frontend slices)

> The synced-vs-derived lens, in its React form: what does the framework already track?

Apply on any React/TypeScript UI slice — the smells a passing build and green tests hide.
Full playbook in [frontend-idioms.md](frontend-idioms.md). Quick scan:

- **Synced state via effect** — `useEffect(() => setX(prop))` / `form.reset(serverData)` in an
  effect. Derive instead (RHF `values` prop). Often *also* a bug: re-runs on late data and
  clobbers edits → raise as 🐛, not 🧹. *Verifiable:* `react inspect <fiberId>` shows the mirror
  holding a stale value while its source has already moved on.
- **Redundant framework-tracked state** — a `useState` mirror of `formState.isSubmitting`,
  `mutation.isPending`, `isDirty`, query `data`. Delete it.
- **Sentinel in a controlled input** — empty → `NaN`/`-1`/`""` threaded through state; breaks
  the input and the validation message. 🐛.
- **Over-memoization** — `useMemo` around `array.find` / trivial compute. Keep only ref-stability
  and genuinely expensive memos. *Verifiable:* `react renders start` → interact → `react renders
  stop --json`. If dropping the memo moves the count by zero, say so with the number.
- **Duplicated source of truth** — same option list / constant in two files or twice in one file.
  *Verifiable (CSS):* `get styles <sel>` vs `get styles :root` — a hardcoded value sitting next to
  an identical token is proof, not suspicion.
- **TS faux pas** — `z.infer`/`z.output` mixed; new `as` assertions; `...Properties` vs `...Props`;
  stringly-typed `id ?? ""` sentinels.

Tag cleanups `🧹`; cross-link any that also cause a bug (`FE1 == D1`).

A *Verifiable* note means the claim is measurable, so measure it rather than asserting it —
recipes in [../../lean-pr-review-visual/reference/evidence.md](../../lean-pr-review-visual/reference/evidence.md).
When the tool isn't available, the lens still applies on inspection; just don't overstate it.

## Bugs & regressions

> What actually breaks at runtime?

**Always apply** — not optional, not deferred to synthesis. Use [bugs.md](bugs.md) for the full playbook.

- Trace happy path **and** empty, loading, stale, and misconfigured paths
- Read callers/consumers outside the diff when the slice changes a contract
- Race between async fetch and user action (persisted state, first paint, send)
- Wrong or empty defaults (`""`, null, fallback bypassing allowlist)
- UI gating mismatched to request payload (hidden control but field still sent, or vice versa).
  *Verifiable:* `network requests --type xhr,fetch` → `network request <id>` for the body
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
