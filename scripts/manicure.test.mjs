import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const detector = fileURLToPath(new URL("../skills/manicure/find-fingernails.sh", import.meta.url));
const hook = fileURLToPath(new URL("../skills/manicure/hook.sh", import.meta.url));
const runDetector = (...paths) => spawnSync("bash", [detector, ...paths], { encoding: "utf8" });
const runHook = (input) => spawnSync("bash", [hook], {
  input: typeof input === "string" ? input : JSON.stringify({ tool_input: input }), encoding: "utf8",
});

test("detector finds CSS, JS, logical borders, shadows, and Tailwind stripes in paths with spaces", () => {
  const dir = mkdtempSync(join(tmpdir(), "manicure test "));
  try {
    writeFileSync(join(dir, "card.css"), ".a { border-left: 4px solid red; }\n.b { border-inline-start: 3px solid blue; }\n.c { box-shadow: inset 3px 0 0 red; }\n");
    writeFileSync(join(dir, "card.tsx"), "const style = { borderLeft: '3px solid red' };\nconst classes = 'border-l-4 border-l-red-500';\nconst logical = 'border-s-4';\nconst absolute = 'absolute inset-y-0 left-0 w-1 bg-red-500';\n");
    const result = runDetector(dir);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout.trim().split("\n").length, 7);
    assert.match(result.stdout, /card\.css:1:/);
    assert.match(result.stdout, /card\.tsx:4:/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("detector leaves clean UI clear, ignores generated files, and propagates unreadable paths", () => {
  const dir = mkdtempSync(join(tmpdir(), "manicure-clean-"));
  try {
    writeFileSync(join(dir, "card.css"), ".a { border: 1px solid grey; background: white; }\n");
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules", "vendor.css"), ".a { border-left: 4px solid red; }\n");
    assert.equal(runDetector(dir).status, 0);
    assert.equal(runDetector(join(dir, "missing.css")).status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("hook checks the new text for Edit, Write, and MultiEdit", () => {
  for (const content of [
    { new_string: "border-left: 4px solid red", old_string: "background: white" },
    { content: "<div class='border-l-4'>Card</div>" },
    { edits: [{ new_string: "background: white" }, { new_string: "borderLeft: '3px solid red'" }] },
  ]) {
    const result = runHook({ file_path: "/project/card.tsx", ...content });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Matches in/);
    assert.ok(result.stderr.includes(join(fileURLToPath(new URL("../skills/manicure/", import.meta.url)), "SKILL.md")));
  }
  assert.equal(runHook({ file_path: "/project/card.tsx", old_string: "border-left: 4px solid red", new_string: "background: white" }).status, 0);
});

test("hook skips unrelated and generated files and surfaces malformed input", () => {
  for (const file_path of ["/project/notes.md", "/project/node_modules/card.css", "/project/dist/card.css"]) {
    assert.equal(runHook({ file_path, content: "border-left: 4px solid red" }).status, 0);
  }
  assert.equal(runHook("{malformed").status, 1);
});
