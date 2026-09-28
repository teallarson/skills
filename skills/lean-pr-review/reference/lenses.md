# Design lenses

Apply each lens to every slice. Skip one only when it clearly doesn't apply, and say why. Runtime bugs have their own pass: [bugs.md](bugs.md).

## Necessity

Would the PR work without this change?

- Dead code, unused imports, commented-out blocks
- Abstractions used once
- Config or env values nothing reads
- Unused new dependencies
- Re-exports that add nothing

## Synced vs. derived state

Is this a second copy of a fact, kept in agreement by hand? Check every slice, backend included. The sign is a value that has to be written to stay correct. Name the source of truth, then ask whether this value can be computed from it.

- The same constant, option list, or enum declared in two files, or twice in one file
- A field, column, or cache that must be updated whenever another one changes
- A flag that is a pure function of other fields (`isEmpty`, `hasError`, `count`, `status`)
- A type or schema copied by hand across a boundary instead of generated or imported
- One setting spread across an env file, deploy config, and a code default
- A stored total with nothing keeping it correct
- Two code paths that must behave the same with nothing enforcing it

A copy is correct when deriving it is expensive (measured), or when it is a deliberate snapshot: an audit record, a historical price, a pinned version. Otherwise derive the value and delete the copy.

For React forms and effects, see [frontend-idioms.md](frontend-idioms.md). A copy that can overwrite user edits is 🐛, not 🧹.

## Simplicity

Is there a smaller diff with the same result?

- Wrappers that only call one thing
- Interface → implementation → adapter for one consumer
- Generic code for a single use case
- A framework or library added for one call site
- Refactors mixed into feature work that could be a separate PR

## Locality

Does this belong in this file, layer, or abstraction?

- Business logic in UI components
- HTTP concerns in the domain layer
- A shared util with one user
- A cross-cutting change duplicated instead of made once
- Test helpers in production code

## Proportionality

Is the amount of code in line with the problem?

- 200 lines for a 5-line behavior change
- A state machine for two states
- A cache before anyone measured a performance problem
- Error handling bigger than the happy path
- Types more elaborate than the data they describe

## Overengineering / speculative generality

Is this built for the current requirement, or for one nobody has asked for? The sign is a justification in the future tense: "so we can later…", "in case we need…".

- A flag, prop, or option with the same value at every call site
- An interface, registry, or plugin hook with one implementation
- Generic parameters where the second caller is hypothetical
- Layers that only pass the call through (handler → service → repo where a hop decides nothing)
- Retry, circuit breaker, cache, or feature flag with no observed failure or measurement behind it
- Null checks the type system already rules out, unreachable `default:` cases
- A shared abstraction extracted from one instance (extract on the third)
- A new dependency, DSL, or generator for one call site

Ask: "What breaks if we delete this and add it back when we need it?" If nothing breaks and adding it later is a small diff, flag it.

Don't flag it when there is a named current consumer, a real failure it prevents, a measured cost it avoids, or a house convention it follows. Say so in the notes instead. A simpler version that drops a behavior is not simpler.

## Pattern fit

Does this follow existing conventions?

- Error handling unlike the surrounding code
- A new test pattern (fixtures, mocks) unlike the rest of the suite
- Different naming conventions
- A new folder structure for one file

Before judging a non-trivial chunk, find how the codebase already solves the same problem: a sibling feature, a shared util, a design-system component, or files a `CLAUDE.md` or rules doc names as canonical. Then check the PR against it:

- **Reinvented:** hand-written where a shared helper exists. Cite the helper.
- **Copied:** a constant, type, or pattern duplicated instead of imported.
- **Near miss:** follows the pattern but breaks from it in one spot. Point at the closest correct example.
- **Correct reuse:** credit it.

Check within changed files too: the same option list declared twice, or one control written the standard way next to a neighbor written by hand.

## Test worth

Does the test prove something the code doesn't already guarantee?

Flag:

- Tests of private methods or internal state
- Mocks of the whole stack that assert the mock was called
- The same path covered identically by unit and integration tests
- Snapshots of generated or boilerplate output
- A test file bigger than the source with few meaningful assertions
- Only the happy path when edge cases are the risk

Credit tests that check behavior a caller cares about, would fail if the requirement regressed, cover the edge case behind the change, and need little setup.

## Scope discipline

Does the change serve the PR's stated intent?

- Formatting changes unrelated to the feature
- Renames outside the touched code
- "While I'm here" improvements
- Unrelated version bumps
- Deleted code with no explanation

## Readability

Will someone understand this in six months without the author?

- One-liners that hide intent
- Abbreviated names in non-trivial logic
- A non-obvious decision with no comment where one line would help
- Deep nesting that could be flattened
- Magic numbers or strings that should be named constants

## Framework idioms (frontend slices)

On React/TypeScript slices, apply [frontend-idioms.md](frontend-idioms.md).

## How to record a finding

1. `file:line`, or the file for a whole-file concern
2. The lens that caught it
3. What: one sentence
4. Why it matters: one sentence
5. The fix, stated concretely: delete, inline, move, derive. Not "consider refactoring."

```
apps/api/handler.go:42 — Simplicity
New `parseAndValidateRequest` wraps 3 lines. Inline at call site; no second caller.
```
