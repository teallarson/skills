// Codex cuts a plugin skill's SKILL.md off at 8,000 bytes (MAX_SKILL_PROMPT_BYTES
// in codex-rs/ext/skills/src/render.rs), so anything past that never reaches the
// model. Put step-specific detail in the skill's reference/ files instead.
import { readdirSync, readFileSync, existsSync } from "node:fs";

const LIMIT = 8000;
const skillsDir = new URL("../skills/", import.meta.url);

const tooBig = [];
for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
  const path = new URL(`${entry.name}/SKILL.md`, skillsDir);
  if (!entry.isDirectory() || !existsSync(path)) continue;
  const bytes = readFileSync(path).length;
  if (bytes > LIMIT) tooBig.push(`  skills/${entry.name}/SKILL.md: ${bytes} bytes`);
}

if (tooBig.length > 0) {
  console.error(`SKILL.md over ${LIMIT} bytes (Codex truncates past this):\n${tooBig.join("\n")}`);
  process.exit(1);
}
console.log(`Every SKILL.md is at most ${LIMIT} bytes.`);
