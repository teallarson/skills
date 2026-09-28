# Bug pass

Run on every slice (Phase 3c) and across slices at synthesis (Phase 4). The question: if this ships exactly as is, what breaks for real users, data, and config?

Classify each hit:

| Label | Meaning |
|---|---|
| **Bug** | Wrong behavior with a plausible trigger. Cite the path. |
| **Likely bug** | A concrete scenario you haven't confirmed. Say what you'd run to confirm it. |
| **Footgun** | Works when set up right, fails silently or confusingly on misconfig or an unusual deploy. |
| **Not a bug** | Intentional or safe. Say why in one line, so it doesn't stay an open question. |

Bugs and likely bugs are 🐛 and footguns are 🦶, each on its own line in the slice verdict. Every one goes in the Phase 4 bug summary.

## Per-slice trace

1. **Happy path:** the feature does what the PR claims.
2. **Empty or zero:** no data, no config, no selection, first load.
3. **Loading or in-flight:** pending fetches, stale cache, optimistic UI.
4. **Stale or concurrent:** persisted state vs fresh server state, double submit, two updates racing.
5. **Invalid input:** malformed payload, missing optional fields, boundary values.
6. **Permission:** unauthenticated, wrong user, missing key. Who fails, and how?
7. **Regression:** what works on `main` that this diff could break? Check callers outside the diff.

When the slice exposes an API or changes shared behavior, read its callers and consumers outside the changed files.

## Across slices (Phase 4)

Trace end to end: config/env → server contract → client state → UI → request → server handler → side effects.

- Do client and server agree on defaults when a field is omitted?
- Does what the UI shows match what the server accepts?
- Are independent subsystems (e.g. model picker and tool loading) coupled by mistake?
- What happens with no env, minimal config, or a misconfigured deploy?

## Checklist

Skip a category only when it clearly doesn't apply, and say why.

### State and timing

- Stale state read after an async call completes
- Effect ordering or a missing dependency
- Optimistic update with no rollback
- Session or cache key scoped too wide or too narrow
- An effect that copies server or prop data into state (`setX`, `form.reset`) and re-runs when the source arrives late, overwriting user edits. Check whether the source is present at first paint (suspense query) or arrives later (non-suspense query, non-awaited prefetch, late prop). If later, the bug is live. See [frontend-idioms.md](frontend-idioms.md).

### Defaults and fallbacks

- Fallback id is an empty string, null, or the wrong type
- The default used when an allowlist is empty, on client and server
- A silent fallback that overrides what the user chose (wrong model, wrong tenant)

### Gating and visibility

- UI control hidden but its field still sent in the request, or the reverse. To check, read the actual request body: `network requests --type xhr,fetch` in [evidence.md](../../lean-pr-review-visual/reference/evidence.md).
- Send or submit enabled before required data is ready
- A setup problem that only shows up as a runtime error

### Data contract

- A type duplicated between client and server that can diverge
- Omitted field vs explicit null treated differently
- API returns X and the UI assumes Y (e.g. `defaultModel` not in `models[]`)

### Security

Check trust boundaries only. For a full audit, note it as out of scope.

- Validation only on the client for input the server trusts
- AuthZ checked at the edge but not where the data is read
- Auth on read but not on write in the same flow, or the reverse
- Allowlist bypass through an omitted field, different casing, or another code path
- Secrets logged or committed

### Platform and UX

- Hover-only interaction with no touch equivalent
- Regenerate, retry, or back button leaves bad state
- Error swallowed, so the user sees success or a spinner that never ends

## Recording

Record as in [lenses.md](lenses.md), plus a repro when you have one:

```
hooks/use-model.ts:71 — Bugs (race)
While the catalog loads, `models` is empty, so the persisted id is treated as dropped and the
request omits `model`; the server picks its default.
Repro: stored model in sessionStorage, hard refresh, send before /config/models returns.
```

## Phase 4 bug summary

```markdown
## Bugs
- **Ship-blocking:** … (or "None")
- **Should fix:** …
- **Footguns / accepted:** …
- **Checked, not bugs:** …
```

Any confirmed ship-blocking bug makes the verdict **needs changes**.
