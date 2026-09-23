# Frontend idiom & framework-smell playbook

Apply on any slice that touches React / TypeScript UI code. These are the smells that a
backend-strong author ships and a compiler + passing tests won't catch. Many are **pure
simplifications**, but several also **mask real bugs** — flag those under 🐛, not 🧹.

Tag findings `🧹` (cleanup / simplification). When an idiom smell also produces a runtime
defect, raise the defect as 🐛 and cross-link the cleanup (`FE1 == D1`).

## The meta-pattern: derive, don't sync

> Is this a **second copy** of a fact that already lives somewhere else, kept in agreement
> by hand — or is it **derived** from the source on each render?

Most FE smells from non-FE authors are one habit: storing synced state instead of deriving
it. The tell is a value that must be *written* to stay correct. Ask of every `useState` /
`useEffect` / duplicated field: **what is the source of truth, and is this derivable from it?**
If yes, derive it and delete the copy. Synced copies drift; derived values can't.

This single question resolves most of the smells below — and usually a bug or two with them.

Several of these are measurable rather than arguable — render counts, live hook values, computed
CSS against the token set. Where a smell carries a *Verifiable* note in
[lenses.md](lenses.md), measure it: recipes in
[../../lean-pr-review-visual/reference/evidence.md](../../lean-pr-review-visual/reference/evidence.md).

## Synced state via effect (the #1 offender)

**Smell:** `useEffect(() => setX(propOrQuery), [propOrQuery])`, or `useEffect(() => form.reset(serverData), [serverData])`.

- Copies server/prop data into local or form state through an effect.
- **Almost always also a bug:** the effect re-runs when the source resolves late (a
  non-awaited prefetch, a second non-suspense query, a prop that arrives after first paint)
  and **clobbers user edits** made in the interim. Silent data loss.
- **Fix (React Hook Form):** the `values` prop + `resetOptions: { keepDirtyValues: true }`.
  Deletes the effect and stops the clobbering in one move.
- **Fix (plain React):** compute during render; if it's expensive, `useMemo`. If you truly
  need to *reset* child state on a prop change, prefer a `key` remount over an effect.

```ts
// Smell: syncs + clobbers dirty edits when `plugin`/`hook` resolve late
useEffect(() => { if (plugin) form.reset({ ...toForm(plugin), ...(hook && { status: hook.status }) }); },
  [plugin, hook, form]);

// Idiom: derive; RHF syncs and respects in-flight edits
useForm({ resolver, defaultValues: DEFAULTS,
  values: plugin ? { ...toForm(plugin), ...(hook && { status: hook.status }) } : undefined,
  resetOptions: { keepDirtyValues: true } });
```

Trace the timing: is the source a **suspense** query (present at paint) or **non-suspense** /
non-awaited prefetch (may arrive after)? If the latter, the reset race is live — call it 🐛.

## Redundant framework-tracked state

**Smell:** `const [isSubmitting, setIsSubmitting] = useState(false)` with a `try/finally` toggle.

- The framework already derives it. RHF exposes `formState.isSubmitting` (tracked across the
  awaited submit handler); React Query exposes `mutation.isPending`. A hand-rolled flag is a
  third copy that can desync (early return, thrown-before-finally).
- **Fix:** delete the state; read `form.formState.isSubmitting` / `mutation.isPending`.

Other framework-tracked values people needlessly mirror: `isDirty`, `isValid`, `errors`,
query `isLoading` / `data`, router search params.

## Sentinel values in controlled inputs

**Smell:** mapping empty → `NaN`, `-1`, `""`, or `null` and threading it through state.

- The classic: `onChange={e => field.onChange(e.target.value === "" ? Number.NaN : Number(...))}`.
  Then `{...field}` spreads `value={NaN}` back into the input → React logs
  `Received NaN for the value attribute`, and the sentinel in state produces the **wrong
  validation message** (`NaN` is `typeof number`, so a "required" check reads as "must be a
  number"). A visible controlled-input violation, not just noise — raise as 🐛.
- **Fix:** map empty → `undefined` and let the schema's optional/required check speak, or use
  RHF `register(..., { valueAsNumber: true })`.

## Over-memoization

**Smell:** `useMemo` / `useCallback` wrapping trivially cheap work (`array.find`, a string
concat, an inline object with primitive contents).

- Reads as "I heard React needs memo," not a measured choice. Adds deps-array surface that
  can go stale.
- **Keep** memos that (a) stabilize a reference passed into a memoized child or effect dep,
  or (b) guard genuinely expensive compute. **Drop** the rest — recompute in render.

## Duplicated source-of-truth data

**Smell:** the same option list / label map / constant declared in two files, **or** twice in
one file (e.g. an `items={MAP}` prop *and* hardcoded `<SelectItem>` children re-listing the
same options). Look for a sibling in the same component doing it right (children generated
from the map) — the inconsistency is the tell.

- **Fix:** one source. Hoist shared constants to a module; generate children from the map.

## Structural / naming TS faux pas

- **`z.infer` vs `z.output` for the same concept** in one file — identical types, two names;
  reads as uncertainty. Pick one (`z.output` states post-parse intent).
- **`as` assertions in new code** — repos with a `no-type-assertion` rule ban them; narrow /
  validate / type-at-source instead. **Credit** a PR that adds none where it sits beside
  baselined casts.
- **`Record<string, T>` for a closed union key** — loses exhaustiveness. Neutral (not a
  faux pas) when paired with a `?? fallback` for forward-compat with unknown API values; say so.
- **Stringly-typed sentinels** (`useThing(id ?? "")`) — an empty string standing for "absent."
  Harmless when the consumer is unused on that path, but a reviewer will trip on it.
- **Naming drift** — `...Properties` where the codebase says `...Props`; an expanded
  auto-rename is itself a non-native tell worth a one-liner.

## React correctness scan (fast pass)

- Component defined **inside** another component (remounts every render) — distinct from a
  module-level helper component, which is fine.
- Array `key` from index (or from a value that isn't guaranteed unique) where reorder/remove
  is possible.
- Hook called conditionally / after an early return.
- Effect that is really an **event** (runs work that should live in the handler) — navigation,
  toasts, mutations belong in handlers, not effects.
- Unstable object/array/function passed to a memoized child or an effect dep array.

## How this feeds the write-up

- In the slice tally, put idiom cleanups on their own `🧹` lines; keep them out of the 🐛/🦶
  lines so severity stays honest.
- If several smells share the derive-don't-sync root, **say so once** in synthesis — "fixing
  one instinct collapses N findings" is more useful to the author than N separate scoldings.
- In the artifact, give frontend idioms their **own section** when the author is non-FE or the
  reviewer asked; interleave by impact otherwise.
