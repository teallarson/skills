# Visual pass recipes (chrome-devtools MCP)

Tool names below drop the `mcp__chrome-devtools__` prefix: `list_pages` means `mcp__chrome-devtools__list_pages`.

## Open the surface

```
list_pages                     # what's already open?
navigate_page (type=url ...)   # go to the story, screen, or preview
```

Check the URL (preview host, branch slug) or a visible marker to confirm you are on the PR branch, not `main`.

## Find the component's document

Storybook renders the story inside `iframe#storybook-preview-iframe`. A dev server or preview URL renders in the top document. Resolve `doc` in every script:

```js
() => {
  const frame = document.querySelector('iframe#storybook-preview-iframe');
  const doc = frame ? frame.contentDocument : document;
  // ...operate on `doc`
}
```

The snippets below use `doc` for that document.

## Inject CSS

Add one keyed `<style>` and rewrite its `textContent` on each iteration:

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

- Target stable hooks (`[data-slot=...]`, roles), not generated class names.
- `!important` is fine; the style is throwaway.
- Check the change applied by reading the computed value, not only the screenshot:

```js
() => getComputedStyle(doc.querySelector('[data-slot="the-thing"]')).justifyContent
```

Navigating to another story or reloading removes injected styles and transforms. Re-inject after every navigation.

## Capture

**Element screenshot** (tightest crop): get the element's `uid` from `take_snapshot`, then `take_screenshot (uid=...)`.

**Transform zoom**, when the shot needs surrounding context:

```js
() => {
  const frame = document.querySelector('iframe#storybook-preview-iframe');
  const doc = frame ? frame.contentDocument : document;
  const root = doc.querySelector('#storybook-root') || doc.body;
  root.style.transformOrigin = 'top left';   // or 'Xpx Ypx' to center on a detail
  root.style.transform = 'scale(1.6)';        // 1.6–2.5 reads well for cards and rows
  return 'zoomed';
}
```

Reset before any native-scale shot: `root.style.transform = ''; root.style.transformOrigin = '';`

**Hover and focus states**: `take_snapshot` for the trigger's `uid`, `hover (uid=...)`, then `take_screenshot` while it is open. For focus, call `.focus()` through `evaluate_script` or tab to it with `press_key`.

**Framing**:

- Frame before and after the same way: same zoom, same crop.
- Capture the state that shows the problem (the long truncated label, the partial selection), not the easy case.
- For alignment across rows, capture several rows.

## Build the report

### Embed screenshots as base64

The report is one self-contained HTML file. macOS screenshot names put a narrow no-break space (U+202F) before `AM`/`PM`, so shell globs and typed paths miss the file. Read the directory listing in Python instead:

```python
import base64, os

d = '/path/to/screenshots'
name = [f for f in os.listdir(d) if f.endswith('.png')][0]
with open(os.path.join(d, name), 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
```

```html
<img src="data:image/png;base64,PASTE_B64_HERE" alt="Before: chevron shifts per row">
```

Build the whole HTML in Python (read each image's base64, substitute it into the template, write the file) rather than pasting 200KB strings through an edit.

### Size images

- Render each shot at about 400–600px wide: a single tooltip at about 400px, a few grid rows at 560–600px. This works only with a tight crop; a full-page shot shrunk to 500px is unreadable.
- Never fill the page width or scale past the shot's natural size. The template caps stacked shots at `--shot-w` (560px); override one with `style="max-width:440px"`.
- Stack wide before/after shots vertically at the same width. Use `.compare.two` (side by side) only for narrow crops that stay legible at half width.
- Go above 600px only when the detail can't be read otherwise, and say why in the caption.
- Caption every image. Before: what the problem is. After: what the fix does.

### Deploy to flypod

Only after the user confirms.

```bash
npx flypod <file>.html          # first deploy; prints the live URL
npx flypod update <file>.html   # new version at the same URL
```

- `flypod update` without the file argument fails with "No build output folder found".
- Give the user the URL. Anonymous deploys expire in 14 days; `flypod login` claims the site to keep it.
