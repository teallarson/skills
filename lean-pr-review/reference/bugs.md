# Bug hunt playbook

Apply **every slice** and again **across slices at synthesis**. Design review alone is not enough — trace behavior.

## Core question

> If I use this exactly as shipped, what breaks — for real users, real data, real config?

Distinguish in findings:

| Label | Meaning |
|-------|---------|
| **Bug** | Incorrect behavior with a plausible trigger — cite the path |
| **Likely bug** | Strong code smell + concrete scenario; say what you'd run to confirm |
| **Footgun** | Misconfig / edge env — works when set up right, fails silently or confusingly otherwise |
| **Not a bug** | Intentional or safe — say why so it doesn't linger as an open question |

## Per-slice trace (3c)

After the earn-your-keep pass, **walk the slice's runtime paths**:

1. **Happy path** — feature works as the PR claims
2. **Empty / zero** — no data, no config, no selection, first load
3. **Loading / in-flight** — fetches pending, stale cache, optimistic UI
4. **Stale / concurrent** — persisted state vs fresh server state; double submit; race between two updates
5. **Invalid input** — malformed client payload, missing optional fields, boundary values
6. **Permission / auth** — unauthenticated, wrong user, missing key — who fails and how?
7. **Regression** — what worked on `main` that this diff could break? Check callers not in the diff.

Read call sites and consumers outside the changed files when the slice exposes an API or changes shared behavior.

## Cross-slice integration (Phase 4)

Before verdict, trace **end-to-end** across slices:

```
Config/env → server contract → client state → UI → request → server handler → side effects
```

Ask explicitly:

- Do client and server agree on defaults when fields are omitted?
- Does UI visibility match what the server will accept or reject?
- Are independent subsystems (e.g. model picker vs tool loading) incorrectly coupled?
- What happens with **zero** env / **minimal** config / **misconfigured** deploy?

## Bug categories checklist

Use as a mental scan — skip only when clearly N/A, say why.

### State & timing
- Read stale state after async completes
- Effect ordering / missing dependency
- Optimistic update without rollback
- Session/cache key scope wrong (too wide / too narrow)

### Defaults & fallbacks
- Fallback id empty string, null, or wrong type
- Default used when allowlist is empty — client and server both
- Silent fallback masks user intent (wrong model, wrong tenant, etc.)

### Gating & visibility
- UI hidden but request still sends (or opposite)
- Send/action enabled when required data isn't ready
- Error only at runtime with no surfaced setup state

### Data contract
- Type duplicated client/server — shape drift
- Optional field omitted vs explicit null semantics
- API returns X, UI assumes Y (e.g. `defaultModel` not in `models[]`)

### Security (bugs, not audit)
- Client-only validation for server-trusted input
- Allowlist bypass via omitted field, wrong casing, or alternate code path
- Auth on read but not write (or vice versa) in the same flow

### Platform & UX
- Touch vs hover-only interaction
- Regenerate / retry / back button leaves bad state
- Error swallowed — user sees success or spinner forever

## How to record

Same as lenses, plus **repro** when you have one:

```
libs/foo/hooks/use-bar.ts:62 — Bugs (race)
While catalog is loading, persisted id is sent; server allowlists — OK. But if persisted
is invalid, first message before fetch completes uses stale id until… [trace ends].
Repro: set sessionStorage, remove model from CHAT_MODELS, hard refresh, send immediately.
```

## Slice verdict symbols

Add to the tally:

| Status | Meaning |
|--------|---------|
| 🐛 | Bug or likely bug — needs fix or explicit acceptance |
| 🦶 | Footgun — document, guard at boot, or accept with eyes open |

Do **not** bury 🐛 items as ⚠️ nits. Bugs get their own line and appear in Phase 4 bug summary.

## Synthesis bug summary (required)

In Phase 4, always include:

```markdown
## Bugs
- **Ship-blocking:** … (or "None")
- **Should fix:** …
- **Footguns / accepted:** …
- **Checked, not bugs:** … (brief — clears lingering doubt)
```

Verdict must account for ship-blocking bugs: **needs changes** if any confirmed.
