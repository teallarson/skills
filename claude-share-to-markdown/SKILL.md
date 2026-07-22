---
name: claude-share-to-markdown
description: Fetch a claude.ai (or claude.com) /share/ conversation link and save the full transcript to a Markdown file an agent can consume. Use when the user pastes a Claude share link and wants its contents, or says "read this claude link", "grab this shared chat", "turn this share into markdown".
argument-hint: "<claude share URL> [output path]"
---

# Claude share link → Markdown

Turn a `claude.ai/share/...` (or `claude.com/share/...`) link into a clean Markdown
transcript on disk.

## Why plain fetch fails

A Claude share page has two walls:

1. **Client-side rendered.** The transcript loads via JavaScript, so a plain HTTP GET
   (`WebFetch`, `curl`) returns an empty shell — literally just "Claude". Don't try it.
2. **Cloudflare managed challenge.** The URL redirects through `/api/challenge_redirect`
   and shows `Just a moment...`. Automation-flagged browsers can stall on it. The bundled
   script handles this with a headful, persistent browser profile — once cleared, the
   `cf_clearance` cookie sticks and later runs pass silently.

## Primary method: run the bundled script

The script does everything: opens a real browser, gets past Cloudflare, extracts the
conversation (preferring the page's JSON payload, falling back to DOM scraping), and writes
Markdown.

From this skill's directory:

```sh
cd <skill-dir>
[ -d node_modules ] || npm install          # first run only (may download Chromium)
node fetch-share.mjs "<share-url>" "<output-path-or-dir>"
# or, after npm install: npx claude-share "<share-url>" "<output-path-or-dir>"
```

- Pass an explicit output path (or directory) as the 2nd arg. If omitted, it writes to
  `./.context/` when that dir exists, else the current directory, as
  `claude-share-<uuid>.md`.
- On success the script prints a JSON line to stdout:
  `{"ok":true,"path":"...","method":"json|dom","turns":N,"title":"..."}`.
  Read `path`, then read that file to confirm and summarize.
- Diagnostics go to stderr (which strategy ran, why a fallback triggered).

### How the script clears Cloudflare

Headful Chrome with a **persistent profile** kept in the skill dir. If Cloudflare doesn't
auto-clear within `RENDER_TIMEOUT_MS` (default 45s), the browser window stays open and the
script waits for you to solve the check **once**. The saved `cf_clearance` cookie makes
subsequent runs hands-off. Set `HEADLESS=1` to force headless (less likely to pass CF —
only for an already-trusted profile).

### Agent workflow

1. Ensure deps: if `node_modules` is missing, run `npm install` in the skill dir.
   If Google Chrome is already installed, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install`
   skips the ~150MB Chromium download (the script prefers system Chrome).
2. Decide the output path — prefer the user's request; else a sensible spot in the current
   workspace (`.context/` or cwd).
3. Run `node fetch-share.mjs "<url>" "<out>"`.
4. If Cloudflare blocks and the browser window opens, tell the user to solve the check there
   — the script waits and continues automatically (no re-run needed on first clearance).
5. On success, read the written file, then report the path + a one-line summary (turn
   count, topic). If `method` was `dom`, note extraction was DOM-scraped and may be
   imperfect.

## Fallback method: chrome-devtools MCP (already-trusted browser)

If the script can't be run but a `chrome-devtools` MCP is attached to a browser that
already passes Cloudflare (e.g. the user's logged-in Chrome), you can drive it directly:
`new_page` → poll until `document.title` isn't "Just a moment..."/"Claude" and messages
render → prefer the conversation JSON from `list_network_requests`/`get_network_request`,
else `evaluate_script` the DOM extractor (the `domExtract` function in `fetch-share.mjs` is
copy-pasteable) → build Markdown the same way. This only works if that browser isn't
automation-flagged; a cold/automation Chrome will sit on the Cloudflare wall forever.

## Notes & edge cases

- **One run at a time.** The persistent browser profile can't be opened by two script
  instances at once. Serialize fetches per skill install (relevant when many agents run in
  parallel).
- **Multiple links:** run the script once per URL.
- **Private / login-gated share:** if the page shows a sign-in wall (not Cloudflare), the
  share isn't public — the script exits with a "requires sign-in" message. It needs a
  logged-in profile to read.
- **Don't fabricate.** If extraction is partial, mark gaps rather than inventing content.
- **Selectors drift.** claude.ai markup changes; the JSON path is robust, but if DOM
  scraping returns junk, inspect the live page and update `domExtract` in `fetch-share.mjs`.
