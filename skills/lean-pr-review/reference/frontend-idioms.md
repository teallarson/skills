# Frontend idioms

Apply on any slice that touches React or TypeScript UI code. These problems pass the compiler and the tests. Tag them 🧹. When one also causes a runtime defect, raise the defect as 🐛 and cross-link the two (`FE1 == D1`).

Most of them come from one habit: storing a synced copy of a value instead of deriving it. For every `useState`, `useEffect`, or duplicated field, ask what the source of truth is and whether this value can be computed from it. If it can, derive it and delete the copy.

Items marked **Measure** can be checked in a browser instead of argued. Recipes: [evidence.md](../../lean-pr-review-visual/reference/evidence.md). Without those tools, report the finding from reading the code and don't claim a measurement.

## Synced state via effect

`useEffect(() => setX(propOrQuery), [propOrQuery])`, or `useEffect(() => form.reset(serverData), [serverData])`.

This is usually also a bug. The effect re-runs when the source arrives late (a non-awaited prefetch, a second non-suspense query, a prop that arrives after first paint) and overwrites edits the user made in the meantime.

- **React Hook Form:** use the `values` prop with `resetOptions: { keepDirtyValues: true }`. This deletes the effect and stops the overwrite.
- **Plain React:** compute during render, with `useMemo` if it's expensive. To reset child state when a prop changes, remount it with a `key` instead of using an effect.

```ts
// Overwrites dirty edits when `plugin` or `hook` resolve late
useEffect(() => { if (plugin) form.reset({ ...toForm(plugin), ...(hook && { status: hook.status }) }); },
  [plugin, hook, form]);

// RHF keeps the form in sync and leaves in-flight edits alone
useForm({ resolver, defaultValues: DEFAULTS,
  values: plugin ? { ...toForm(plugin), ...(hook && { status: hook.status }) } : undefined,
  resetOptions: { keepDirtyValues: true } });
```

Check the timing. If the source is a suspense query, it's present at first paint. If it's a non-suspense query or a non-awaited prefetch, it can arrive later and the bug is live.

**Measure:** `react inspect <fiberId>` shows the copy holding a stale value after its source has changed.

## State the framework already tracks

`const [isSubmitting, setIsSubmitting] = useState(false)` toggled in a `try/finally`.

React Hook Form has `formState.isSubmitting`; React Query has `mutation.isPending`. A hand-kept flag can fall out of sync on an early return or a throw before `finally`. Delete it and read the framework's value.

Other values people copy for no reason: `isDirty`, `isValid`, `errors`, query `isLoading` and `data`, router search params.

## Sentinel values in controlled inputs

Mapping an empty input to `NaN`, `-1`, `""`, or `null` and storing that in state.

The common case: `onChange={e => field.onChange(e.target.value === "" ? Number.NaN : Number(...))}`. Spreading `{...field}` then passes `value={NaN}` back to the input, React logs `Received NaN for the value attribute`, and validation shows the wrong message (`NaN` is a number, so "required" reads as "must be a number"). Raise it as 🐛.

Fix: map empty to `undefined` and let the schema's required check run, or use `register(..., { valueAsNumber: true })`.

## Over-memoization

`useMemo` or `useCallback` around cheap work: `array.find`, string concatenation, an inline object of primitives.

Each one adds a dependency array that can go stale. Keep memos that keep a reference stable for a memoized child or an effect dependency, or that guard expensive work. Drop the rest.

**Measure:** `react renders start`, interact, `react renders stop --json`. If removing the memo changes the render count by zero, report the number.

## Duplicated data

The same option list, label map, or constant in two files, or twice in one file (for example an `items={MAP}` prop next to hardcoded `<SelectItem>` children listing the same options). A sibling in the same component that generates its children from the map shows the right way.

Fix: keep one definition. Move shared constants to a module and generate children from the map.

**Measure (CSS):** compare `get styles <sel>` with `get styles :root`. A hardcoded value identical to an existing token confirms the duplicate.

## TypeScript

- `z.infer` and `z.output` used for the same type in one file. Pick one; `z.output` states the post-parse type.
- New `as` assertions. Repos with a `no-type-assertion` rule ban them; narrow, validate, or type at the source. Credit a PR that adds none next to existing casts.
- `Record<string, T>` for a closed set of keys loses exhaustiveness checks. It's fine when paired with a `?? fallback` for unknown API values; say so.
- Empty-string sentinels (`useThing(id ?? "")`) standing for "absent." Harmless when the consumer is unused on that path, but confusing to readers.
- Naming that differs from the codebase, such as `...Properties` where the repo uses `...Props`.

## React correctness

- A component defined inside another component, which remounts it every render. A module-level helper component is fine.
- Array `key` from the index, or from a value that may not be unique, where items can be reordered or removed.
- A hook called conditionally or after an early return.
- An effect doing event work. Navigation, toasts, and mutations belong in handlers.
- A new object, array, or function each render passed to a memoized child or an effect dependency array.

## In the write-up

- Put 🧹 items on their own lines in the slice verdict, separate from 🐛 and 🦶.
- If several findings share the synced-copy cause, say so once at synthesis: fixing that habit fixes all of them.
- Give frontend findings their own report section when the author doesn't usually write frontend code or the user asked. Otherwise order them by impact with the rest.
