#!/usr/bin/env node
// Fetch a claude.ai / claude.com /share/ conversation and write it to Markdown.
//
// The obstacle is Cloudflare's "Just a moment..." managed challenge, which blocks
// automation-flagged browsers. The fix: headful Chrome with cookies saved to
// storage-state.json. Once Cloudflare is cleared (auto, or a one-time human solve in the
// window that opens), the cf_clearance cookie is saved and later runs pass silently.
//
// Extraction prefers the JSON payload the page fetches (clean roles + verbatim code) and
// falls back to scraping the rendered DOM.
//
// Usage:  node fetch-share.mjs <share-url> [output-path-or-dir]
// Env:    HEADLESS=1                 run headless (less likely to pass CF; only for an
//                                    already-trusted profile)
//         RENDER_TIMEOUT_MS=45000    how long to wait for Cloudflare + render
//         LOCK_WAIT_MS=600000        max wait when another run is doing first-time CF
//                                    setup (0 = fail fast)

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(HERE, "profile");
const STORAGE_STATE = path.join(PROFILE_DIR, "storage-state.json");
const SETUP_LOCK = path.join(PROFILE_DIR, ".setup-lock");
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 45000);
const LOCK_WAIT_MS = Number(process.env.LOCK_WAIT_MS ?? 600000);

const url = process.argv[2];
const outArg = process.argv[3];

if (!url || !/^https?:\/\/claude\.(ai|com)\/share\/[\w-]+/.test(url)) {
  console.error("Usage: node fetch-share.mjs <https://claude.ai/share/UUID> [output path or dir]");
  process.exit(2);
}
const uuid = (url.match(/share\/([\w-]+)/) || [])[1] || "share";

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockPid(file) {
  try {
    const pid = Number(fs.readFileSync(file, "utf8").trim());
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function tryAcquireSetupLock() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const existing = readLockPid(SETUP_LOCK);
  if (existing && !isPidAlive(existing)) fs.unlinkSync(SETUP_LOCK);
  try {
    fs.writeFileSync(SETUP_LOCK, String(process.pid), { flag: "wx" });
    return true;
  } catch (e) {
    if (e.code === "EEXIST") return false;
    throw e;
  }
}

async function acquireSetupLock() {
  const start = Date.now();
  let logged = false;
  while (true) {
    if (tryAcquireSetupLock()) {
      return () => {
        try {
          fs.unlinkSync(SETUP_LOCK);
        } catch {}
      };
    }
    if (LOCK_WAIT_MS === 0) {
      console.error("Another fetch is doing first-time Cloudflare setup.");
      console.error("Set LOCK_WAIT_MS>0 to queue, or wait for the other run to finish.");
      process.exit(4);
    }
    if (Date.now() - start >= LOCK_WAIT_MS) {
      console.error(`Timed out after ${LOCK_WAIT_MS}ms waiting for Cloudflare setup.`);
      process.exit(4);
    }
    if (!logged) {
      console.error("Another fetch is clearing Cloudflare — waiting…");
      logged = true;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function persistStorageState(ctx) {
  const tmp = `${STORAGE_STATE}.tmp`;
  await ctx.storageState({ path: tmp });
  fs.renameSync(tmp, STORAGE_STATE);
}

async function launchBrowser() {
  const headless = process.env.HEADLESS === "1";
  const args = ["--disable-blink-features=AutomationControlled"];
  let browser;
  try {
    browser = await chromium.launch({ headless, channel: "chrome", args });
  } catch {
    browser = await chromium.launch({ headless, args });
  }
  const ctxOpts = { noViewport: true };
  if (fs.existsSync(STORAGE_STATE)) ctxOpts.storageState = STORAGE_STATE;
  const ctx = await browser.newContext(ctxOpts);
  return { browser, ctx };
}

// ---------------------------------------------------------------------------
// In-page DOM extractor (fallback). Kept resilient; claude.ai markup drifts.
// ---------------------------------------------------------------------------
function domExtract() {
  const clean = (s) => (s || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  const toMd = (root) => {
    const parts = [];
    const walk = (n) => {
      if (n.nodeType === 3) { parts.push(n.textContent); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === "pre") {
        const l = n.querySelector('[class*="language-"]');
        const m = l && l.className.match(/language-([\w-]+)/);
        parts.push(`\n\`\`\`${m ? m[1] : ""}\n${n.innerText}\n\`\`\`\n`);
        return;
      }
      if (tag === "code" && !n.closest("pre")) { parts.push("`" + n.innerText + "`"); return; }
      if (tag === "a") {
        const h = n.getAttribute("href");
        parts.push(h ? `[${n.innerText}](${h})` : n.innerText);
        return;
      }
      if (tag === "li") { parts.push("\n- "); n.childNodes.forEach(walk); return; }
      if (/^h[1-6]$/.test(tag)) { parts.push("\n" + "#".repeat(+tag[1]) + " "); n.childNodes.forEach(walk); parts.push("\n"); return; }
      const block = ["p", "div", "ul", "ol", "blockquote", "br", "table", "tr"].includes(tag);
      if (block) parts.push("\n");
      n.childNodes.forEach(walk);
      if (block) parts.push("\n");
    };
    walk(root);
    return clean(parts.join(""));
  };
  const userSel = '[data-testid="user-message"]';
  const users = Array.from(document.querySelectorAll(userSel));
  const turns = [];
  if (users.length) {
    const c = users[0].closest("main") || users[0].closest('[class*="conversation"]') || document.body;
    let role = null, bucket = [];
    const flush = () => {
      if (role && bucket.length) {
        const md = clean(bucket.map(toMd).join("\n"));
        if (md) turns.push({ role, markdown: md });
      }
      bucket = [];
    };
    for (const b of Array.from(c.children)) {
      const next = (b.matches(userSel) || b.querySelector(userSel)) ? "user" : "assistant";
      if (next !== role) { flush(); role = next; }
      bucket.push(b);
    }
    flush();
  }
  if (!turns.length) turns.push({ role: "unknown", markdown: toMd(document.querySelector("main") || document.body) });
  const title = (document.title || "").replace(/\s*[-|]\s*Claude.*$/i, "").trim() || null;
  return { title, turns };
}

// ---------------------------------------------------------------------------
// JSON payload extractor (preferred). Handles the common Claude message shapes.
// ---------------------------------------------------------------------------
function looksLikeConversation(b) {
  if (!b || typeof b !== "object") return false;
  const arr = b.chat_messages || b.messages || (Array.isArray(b) ? b : null);
  return Array.isArray(arr) && arr.some((m) => m && (m.sender || m.role) && (m.text || m.content));
}
function fence(obj) {
  return "```json\n" + JSON.stringify(obj, null, 2) + "\n```";
}
function renderToolResult(b) {
  const c = b.content;
  const parts = [];
  if (Array.isArray(c) && c.length) {
    if (c.every((x) => x && x.type === "knowledge")) {
      // web_search-style results → readable source list
      parts.push(
        c.map((k, i) => {
          const site = k.metadata?.site_name || k.metadata?.site_domain || "";
          return `${i + 1}. [${k.title || k.url}](${k.url})${site ? ` — ${site}` : ""}`;
        }).join("\n")
      );
    } else {
      for (const x of c) {
        if (typeof x === "string") parts.push(x);
        else if (x && x.type === "text") parts.push(x.text || "");
        else parts.push(fence(x));
      }
    }
  } else if (typeof c === "string" && c.trim()) {
    parts.push(c);
  }
  if (b.structured_content) parts.push(fence(b.structured_content));
  const out = parts.join("\n\n").trim();
  return out || "_(no output recorded in share)_";
}
function blockToText(b) {
  if (typeof b === "string") return b;
  if (!b || typeof b !== "object") return "";
  if (b.type === "text") return b.text || "";
  if (b.type === "thinking") return b.thinking ? `> 💭 **Thinking**\n>\n${b.thinking.split("\n").map((l) => "> " + l).join("\n")}` : "";
  if (b.type === "tool_use") {
    const label = b.name || "tool";
    const integ = b.integration_name ? ` · ${b.integration_name}` : "";
    const input = b.input == null ? "_(no input recorded in share)_" : fence(b.input);
    return `**🔧 Tool call — \`${label}\`**${integ}\n\n${input}`;
  }
  if (b.type === "tool_result") {
    const label = b.name || "tool";
    const err = b.is_error ? " ⚠️ error" : "";
    return `**📄 Tool result — \`${label}\`**${err}\n\n${renderToolResult(b)}`;
  }
  if (b.type === "image") return `[image${b.source?.media_type ? `: ${b.source.media_type}` : ""}]`;
  return b.text || "";
}
function turnsFromJson(body) {
  const msgs = body.chat_messages || body.messages || (Array.isArray(body) ? body : null);
  if (!Array.isArray(msgs)) return null;
  const turns = [];
  for (const m of msgs) {
    const raw = String(m.sender || m.role || "").toLowerCase();
    const role = raw === "human" || raw === "user" ? "user" : raw === "assistant" ? "assistant" : (raw || "unknown");
    // Prefer the content-block array: it interleaves text + tool calls in order.
    // The flat `text` field omits tool calls, so only use it as a fallback.
    let text = "";
    if (Array.isArray(m.content) && m.content.length) text = m.content.map(blockToText).filter(Boolean).join("\n\n");
    else if (typeof m.text === "string" && m.text.trim()) text = m.text;
    else if (typeof m.content === "string") text = m.content;
    if (Array.isArray(m.attachments)) for (const a of m.attachments) text += `\n\n[attachment: ${a.file_name || a.name || "file"}]`;
    if (Array.isArray(m.files)) for (const f of m.files) text += `\n\n[attachment: ${f.file_name || f.name || "file"}]`;
    if (text.trim()) turns.push({ role, markdown: text.trim() });
  }
  return turns.length ? turns : null;
}

// ---------------------------------------------------------------------------
// Render wait: returns "ready" | "cloudflare" | "login" | "timeout"
// ---------------------------------------------------------------------------
function isGated(s) {
  return s.title === "Just a moment..." || /challenge_redirect|__cf_chl/.test(s.url);
}

function classifyPage(s) {
  if (!s) return null;
  if (isGated(s)) return "cloudflare";
  if (s.hasMsg || s.len > 600) return "ready";
  if (/sign in|log in|logged out/i.test(s.text) && s.len < 600) return "login";
  return "loading";
}

async function getPageState(page) {
  return page
    .evaluate(() => ({
      title: document.title,
      url: location.href,
      len: document.body ? document.body.innerText.length : 0,
      hasMsg: !!document.querySelector('[data-testid="user-message"]'),
      text: (document.body?.innerText || "").slice(0, 400),
    }))
    .catch(() => null);
}

async function waitForRender(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = classifyPage(await getPageState(page));
    if (status === "ready" || status === "login") return status;
    await page.waitForTimeout(1500);
  }
  const final = classifyPage(await getPageState(page));
  if (final === "cloudflare") return "cloudflare";
  if (final === "ready" || final === "login") return final;
  return "timeout";
}

async function waitForCloudflareClear(page) {
  console.error("Cloudflare challenge — solve it in the browser window (Ctrl+C to cancel)…");
  while (true) {
    const status = classifyPage(await getPageState(page));
    if (status === "ready" || status === "login") return status;
    await page.waitForTimeout(1500);
  }
}

// ---------------------------------------------------------------------------
// Drive one page through render + extraction.
// ---------------------------------------------------------------------------
async function harvest(page, ctx, timeoutMs) {
  // Disable HTTP cache so the conversation API response always carries a readable body.
  // With saved cookies, a warm run otherwise serves a bodyless 304 and the JSON
  // capture silently misses, forcing a lossy DOM fallback.
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  } catch {}

  const jsonHits = [];
  page.on("response", async (resp) => {
    try {
      const ct = resp.headers()["content-type"] || "";
      if (!ct.includes("json")) return;
      if (!/claude\.(ai|com)/.test(resp.url())) return;
      const body = await resp.json().catch(() => null);
      if (looksLikeConversation(body)) jsonHits.push(body);
    } catch {}
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs }).catch(() => {});
  let status = await waitForRender(page, timeoutMs);
  if (status === "cloudflare") {
    if (process.env.HEADLESS === "1") return { status: "cloudflare" };
    const releaseSetup = await acquireSetupLock();
    try {
      status = await waitForCloudflareClear(page);
      if (status === "ready") await persistStorageState(ctx);
    } finally {
      releaseSetup();
    }
  }
  if (status !== "ready") return { status };

  // Nudge lazy-rendered long chats to fully load.
  await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));
    window.scrollTo(0, 0);
  }).catch(() => {});

  // Let in-flight JSON response handlers finish.
  await page.waitForTimeout(500);

  const pageTitle = await page
    .evaluate(() => {
      const t = (document.title || "").replace(/\s*[-|]\s*Claude.*$/i, "").trim();
      return t && !/^claude$/i.test(t) ? t : null; // generic "Claude" isn't a real title
    })
    .catch(() => null);

  for (const body of jsonHits) {
    if (process.env.DUMP_JSON) fs.writeFileSync(process.env.DUMP_JSON, JSON.stringify(body, null, 2));
    const turns = turnsFromJson(body);
    if (turns) return { status: "ready", method: "json", title: body.snapshot_name || body.name || body.title || pageTitle || null, turns };
  }
  const dom = await page.evaluate(domExtract);
  return { status: "ready", method: "dom", title: dom.title || pageTitle, turns: dom.turns };
}

// ---------------------------------------------------------------------------
// Headful Chrome; cookies (incl. cf_clearance) persist in storage-state.json.
// Each run gets its own browser — parallel fetches are fine once cookies exist.
// ---------------------------------------------------------------------------
async function tryLocal() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  let browser;
  let ctx;
  try {
    ({ browser, ctx } = await launchBrowser());
    const page = await ctx.newPage();
    return await harvest(page, ctx, RENDER_TIMEOUT_MS);
  } finally {
    try {
      if (ctx) await persistStorageState(ctx);
    } catch {}
    await ctx?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
function yamlQuote(s) {
  return JSON.stringify(String(s));
}

function buildMarkdown({ title, turns }) {
  const t = title || "claude-share";
  const now = new Date().toISOString().slice(0, 10);
  const body = turns
    .map((x) => `## ${x.role === "user" ? "🧑 User" : x.role === "assistant" ? "🤖 Assistant" : "❔ " + x.role}\n\n${x.markdown}`)
    .join("\n\n");
  return `---\nsource: ${url}\ntitle: ${yamlQuote(t)}\nfetched: ${now}\nturns: ${turns.length}\n---\n\n# ${t}\n\n${body}\n`;
}

function resolveOutPath() {
  if (outArg) {
    if (outArg.endsWith(".md")) return outArg;
    return path.join(outArg, `claude-share-${uuid}.md`);
  }
  const ctxDir = path.join(process.cwd(), ".context");
  const dir = fs.existsSync(ctxDir) ? ctxDir : process.cwd();
  return path.join(dir, `claude-share-${uuid}.md`);
}

// ---------------------------------------------------------------------------
async function main() {
  console.error("→ opening share (headful Chrome)…");
  const result = await tryLocal();

  if (result.status !== "ready") {
    if (result.status === "login") {
      console.error("This share appears to require sign-in (not a Cloudflare wall). It may be private.");
      process.exit(3);
    }
    if (result.status === "cloudflare") {
      console.error("Cloudflare challenge did not clear (HEADLESS=1 cannot be solved interactively).");
      console.error("Re-run without HEADLESS=1 and solve the check in the browser window once.");
      process.exit(1);
    }
    console.error(`✗ page did not render in time (${result.status}).`);
    console.error("Try increasing RENDER_TIMEOUT_MS or check the share URL.");
    process.exit(1);
  }
  console.error(`✓ rendered (${result.method})`);

  if (!result.turns?.length) { console.error("No conversation content extracted."); process.exit(1); }

  const outPath = resolveOutPath();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buildMarkdown(result));
  // Machine-readable result on stdout for the calling agent.
  console.log(JSON.stringify({ ok: true, path: outPath, method: result.method, turns: result.turns.length, title: result.title || null }));
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });
