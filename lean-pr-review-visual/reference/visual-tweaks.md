# Live visual-tweak workflow (chrome-devtools MCP)

Prototype UI polish in a real browser, capture readable before/after, hand back the exact diff. Nothing here edits the repo — the browser is the sketchpad.

## Works on any rendered surface

The target can be running **anywhere** — pick whichever the user already has:

- **Storybook** — local (`bun run storybook`, `make dev`) or a deployed branch preview (e.g. a Vercel Storybook URL for the PR branch).
- **The app's dev server** — dashboard on `:5173`, etc.
- **A deploy/branch preview URL** — Vercel/Netlify preview for the PR, a staging link, or any hosted build.
- **A tab the user already has open and authenticated** — reuse it; don't force a re-login.

Confirm the surface first:

```
list_pages                     # what's already open?
navigate_page (type=url ...)   # or go to the story / screen / preview
```

Always confirm you're looking at the **branch under review**, not `main` — check the URL (preview host / branch slug) or a visible marker.

### The one structural difference: Storybook renders in an iframe

Storybook puts the story inside `iframe#storybook-preview-iframe`. To touch the rendered component you must reach into the iframe document:

```js
const doc = document.querySelector('iframe#storybook-preview-iframe').contentDocument;
```

A plain dev server or preview URL renders in the top document — use `document` directly. **Detect which you're on** before injecting:

```js
() => {
  const frame = document.querySelector('iframe#storybook-preview-iframe');
  const doc = frame ? frame.contentDocument : document;
  // ...operate on `doc`
}
```

Everything below uses `doc` to mean "the document the component actually lives in."

## Inject CSS to prototype (never edit the repo)

Add a keyed `<style>` so you can rewrite or remove it cleanly across iterations:

```js
() => {
  const frame = document.querySelector('iframe#storybook-preview-iframe');
  const doc = frame ? frame.contentDocument : document;
  let s = doc.getElementById('review-tweak');
  if (!s) { s = doc.createElement('style'); s.id = 'review-tweak'; doc.head.appendChild(s); }
  s.textContent = `
    [data-slot="the-thing"] { /* prototyped change */ }
  `;
  return 'applied';
}
```

- Prefer targeting stable hooks (`[data-slot=...]`, roles) over generated class names.
- Use `!important` freely — you're overriding a built stylesheet, and this is throwaway.
- Iterate by rewriting `s.textContent`; you don't need to remove and re-add.
- **Verify it took** — read back `getComputedStyle` for the property you changed rather than trusting the screenshot alone:

```js
() => getComputedStyle(doc.querySelector('[data-slot="the-thing"]')).justifyContent
```

### Styles are lost on navigation / reload

Injected `<style>` and any transform you set live in the DOM, so **navigating to another story or reloading wipes them**. Re-inject after every navigation. If you're comparing across stories, keep the inject snippet handy and re-run it each time.

## Capture READABLE before/after — this is the whole point

Component UI is small; a full-page shot makes a 12px change invisible. Always zoom to the detail. Two ways:

### Option 1 — element screenshot (cleanest)

Grab a `uid` from `take_snapshot`, then screenshot just that element:

```
take_snapshot                       # find the element's uid
take_screenshot (uid=..., ...)      # tight shot of just that element
```

### Option 2 — CSS transform zoom (when you want surrounding context)

Scale the story root around a point, screenshot, then reset:

```js
() => {
  const frame = document.querySelector('iframe#storybook-preview-iframe');
  const doc = frame ? frame.contentDocument : document;
  const root = doc.querySelector('#storybook-root') || doc.body;
  root.style.transformOrigin = 'top left';   // or 'Xpx Ypx' to center on a detail
  root.style.transform = 'scale(1.6)';        // 1.6–2.5 reads well for cards/rows
  return 'zoomed';
}
```

**Always reset before the final/native-scale shot:**

```js
root.style.transform = ''; root.style.transformOrigin = '';
```

### Triggering hover / tooltip / focus states

Some things only appear on interaction (tooltips, hover strips). Drive it:

```
take_snapshot        # get the uid of the trigger
hover (uid=...)      # opens the tooltip / hover state
take_screenshot      # capture while it's open
```

For focus-only states, `evaluate_script` calling `.focus()` on the element, or `press_key` to tab to it.

### Framing rules

- Before and after must be framed **the same way** (same zoom, same crop) so the comparison is honest.
- Capture the state that shows the issue — the partial-selection row, the long truncated label, the setup strip — not just the easy case.
- If the change is about alignment/stability across rows, capture **several rows** so the reader sees the column line up (or not).

## Embed screenshots as base64 — no drag-and-drop, ever

The artifact must be a single self-contained file. Save shots to disk (or let the harness save them), then inline them.

### macOS filename gotcha

macOS screenshot filenames use a **narrow no-break space** (` `) before `AM`/`PM`, not a regular space — e.g. `Screenshot 2026-07-21 at 11.08.41␣AM.png`. Shell globbing and literal-space paths **fail to find the file**. Encode via Python, which handles the real bytes:

```python
import base64, os

# List the dir to get the exact name (with the real  ), don't hand-type it:
d = '/path/to/screenshots'
name = [f for f in os.listdir(d) if f.endswith('.png')][0]
with open(os.path.join(d, name), 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
```

Then drop it into the HTML:

```html
<img src="data:image/png;base64,PASTE_B64_HERE" alt="Before: chevron shifts per row">
```

Build the whole HTML in Python (read each `.b64`, string-substitute into the template, write the file) so you never paste a 200KB string into an edit.

## Sizing in the report

- **Wide shots** (grids, full rows): stack **full page width** (max ~1100px container). Three squished columns make detail unreadable — the user explicitly called this out.
- **Tall/portrait crops** (a single tooltip, one card): side-by-side is fine.
- Every image gets a **caption**: before = what the problem is; after = what the fix does.

## Ship to flypod from the CLI (no drag-and-drop)

```bash
npx flypod <file>.html          # first deploy → prints live URL (e.g. https://<hash>.flypod.dev)
npx flypod update <file>.html   # push a revision → same URL, new version
```

- `flypod update` with **no** file argument fails ("No build output folder found") — always pass the file explicitly.
- Anonymous deploys are ephemeral (14 days). `flypod login` claims the site if the user wants it permanent.
- Give the user the live URL; that's what they share.

## Quick sanity checklist before handing over

- [ ] Confirmed the surface is the PR branch, not `main`.
- [ ] Before/after framed identically, zoomed enough to read the change.
- [ ] Captured the revealing state (truncated / partial / interactive), not just the easy one.
- [ ] Variants labeled with a recommendation when it's a taste call.
- [ ] Screenshots embedded as base64 (self-contained), each with a caption.
- [ ] Each visual finding has a one-line *why it's better* + the exact diff.
- [ ] Shipped via `npx flypod` — URL handed to the user, no drag-and-drop anywhere.
