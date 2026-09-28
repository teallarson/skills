# Evidence probes (agent-browser)

These probes measure runtime claims that would otherwise be argued from source. They are optional: if the CLI is missing or too old, say so in one line and continue the review.

## Preflight

```bash
agent-browser --version      # need >= 0.30
```

Older versions lack `a11y`, `diff`, `batch`, `react`, and `skills`. To upgrade, run `npm i -g agent-browser@latest` (Node >= 24), then `agent-browser install` to fetch Chrome for Testing.

The CLI is pre-1.0 and its flags change often. If a recipe errors, run `agent-browser skills get core` for usage that matches the installed version instead of guessing.

Pass `--json` to every command. Without it, several probes print `✓ Done` and drop their result. A dropped `react tree` looks the same as the empty tree a production build returns.

## Which tool does what

- Live CSS prototyping: chrome-devtools MCP, in a headed browser the user can watch.
- Probes: agent-browser, in one batch call.
- Cropped screenshots: either. chrome-devtools uses `take_screenshot (uid=...)`; agent-browser uses `screenshot [selector] [path]`.

The two tools run separate browsers. chrome-devtools has no way to set cookies, so auth given to agent-browser (`--state <path>`, `--profile`, `--restore`) never reaches it. For a login-gated target, run the whole visual pass in agent-browser, screenshots included. Use chrome-devtools only for targets without a login, such as Storybook.

Give agent-browser its own session, `--session review-<pr-number>`, so it doesn't take over the tab the user is watching.

## The batch, per UI slice

```bash
agent-browser open --enable react-devtools --session review-<pr> <story-or-route-url>
agent-browser --session review-<pr> batch --json \
  "a11y --selector <changed-component-selector>" \
  "get styles <changed-component-selector>" \
  "network requests --type xhr,fetch"
```

`batch --json` returns an ordered array with `success` or `error` per command, so one failed probe doesn't lose the others.

## What each probe answers

**`a11y --selector <sel>`**: bundled axe-core, no network. Returns violations with rule ID, impact, failing node HTML, and fix guidance. A violation turns a taste call into a WCAG rule ID.

**`get styles <sel>`**: computed CSS. On `:root` or `body` it lists every CSS custom property, which are the design tokens. A component's hardcoded `#888` next to `--accents-4: #888` shows the value copies a token.

**`network requests --type xhr,fetch`**: what the app actually sent. This settles "the control is hidden but the field is still sent" without tracing code. Filter with `--method PUT` or `--status`.

- `network request <id>` is documented to return the body, but in 0.35.0 the listing shows `id: null` for every entry. To read a body, re-issue the call with `eval` using an absolute URL. A relative path hits the dev server's SPA fallback, which returns `index.html` with status 200. Recording `network har start --content text` before the interaction is documented but untested here.
- A count is often enough. Run the interaction with the suspect condition and again without it. A submit blocked in the browser shows as zero requests.

### Faking a server response

`network route --body` returns a made-up response and has no header or status flags. The stub has no `Access-Control-Allow-Origin`, so a cross-origin call fails as a network error. Same-origin calls work.

For cross-origin calls, or whenever a real response exists, rewrite the real response with an init script. Auth, headers, and every other field stay real, instead of hand-writing the whole payload to change one field.

```bash
agent-browser --session review-<pr> --init-script ./patch.js open <url>
```

```js
// patch.js — change one field; everything else stays real
const orig = window.fetch;
window.fetch = async function (...a) {
  const res = await orig.apply(this, a);
  if (!res.url.includes('/the-endpoint')) return res;
  const j = await res.clone().json();
  j.data.some_limit = 5;
  return new Response(JSON.stringify(j), {status: res.status, headers: res.headers});
};
```

- Match on `res.url`. The request argument can be a string, a `URL`, or a `Request`.
- axios uses XHR in the browser by default, so a `fetch` patch installs and never runs. Check with `eval "window.fetch.toString().slice(0,80)"` and a counter in the patch.

### React probes

These need `open --enable react-devtools`, so the hook installs before page JS, and a development build: Vite dev server or Storybook, not a deployed preview.

- `react renders start`, interact, then `react renders stop --json`: render counts. If removing a `useMemo` changes the count by zero, report that number as the evidence the memo does nothing.
- `react tree --json`, then `react inspect <fiberId> --json`: props, hooks, state, and source for one component. The content is at `.data.tree`, and at `.data.text` for `inspect`.

Hooks are listed in call order with index, type, and current value:

```
AccordionRoot #76
props:
  className: "flex w-full flex-col"
  multiple: false
  children: [<AccordionItem />, <AccordionItem />, <AccordionItem />]
hooks:
  [0] LayoutEffect: () => {}
  [1] Memo: []
  Controlled: undefined (6 sub)
  [11] Memo: {value: [], disabled: false, orientation: "vertical"}
rendered by: Accordion > hookified > unboundStoryFn
```

A `Memo:` holding a trivial literal is a memo that does nothing. A `State:` holding a value its source has moved past is the stale-copy bug, seen directly. Custom hooks appear as named entries with a sub-hook count.

`source` follows the fiber, so a library component points into the bundled dependency. Walk up to the repo's own wrapper to get a file and line to cite.

Two failures look alike. `✗ No React renderer attached` means the hook is missing or React hasn't started, often because a bad URL rendered a blank page. A valid but empty tree means the tree really is empty. Before deciding the React probes are unavailable, confirm you passed `--json` and opened with `--enable react-devtools`.

## Regression shots against main (optional)

```bash
agent-browser diff url <main-preview-url> <branch-preview-url> --screenshot
agent-browser diff screenshot --baseline before.png -o diff.png
```

This answers "what regresses vs `main`?" in pixels. It needs deploy previews for both base and head.

## Reporting

Add one line to the existing finding:

> **Evidence** — axe `color-contrast`, impact serious, on `.tool-count` (3.9:1).

A clean result gets one line too: "axe clean on the changed subtree; render count unchanged without the memo." No raw JSON in the report.
