import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const problems = [];
const names = new Set();
const designSkills = ["manicure", "impeccable"];

for (const entry of readdirSync(join(root, "skills"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const path = join(root, "skills", entry.name, "SKILL.md");
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8");
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const name = frontmatter?.match(/^name: ([a-z0-9-]+)$/m)?.[1];
  if (name !== entry.name) problems.push(`${path}: name must match its folder`);
  if (!/^description:\s*\S/m.test(frontmatter ?? "")) problems.push(`${path}: missing description`);
  if (names.has(name)) problems.push(`${path}: duplicate name ${name}`);
  names.add(name);
}

function inspect(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    problems.push(`${path}: package resources must not depend on external symlinks`);
  } else if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) inspect(join(path, entry));
  } else if (path.endsWith(".md")) {
    const text = readFileSync(path, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const match of text.matchAll(/\]\(([^\s)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || target.startsWith("/") || /^[a-z]+:/i.test(target)) continue;
      const destination = resolve(dirname(path), target);
      if (!destination.startsWith(root)) problems.push(`${path}: link escapes package: ${target}`);
      else if (!existsSync(destination)) problems.push(`${path}: missing resource: ${target}`);
    }
  }
}

for (const name of designSkills) {
  if (!names.has(name)) problems.push(`Missing design skill: ${name}`);
  else inspect(join(root, "skills", name));
}

for (const resource of [
  "manicure/find-fingernails.sh", "manicure/hook.sh", "manicure/patterns.txt",
  "impeccable/LICENSE", "impeccable/NOTICE.md", "impeccable/reference/commands.md",
  "impeccable/licenses/platform-design-skills-MIT.txt", "impeccable/licenses/modern-screenshot-MIT.txt",
  "impeccable/scripts/impeccable", "impeccable/scripts/impeccable.cmd",
  "impeccable/scripts/command-metadata.json", "impeccable/agents/openai.yaml",
]) {
  if (!existsSync(join(root, "skills", resource))) problems.push(`Missing bundled resource: ${resource}`);
}

const interfaceMetadata = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8")).extensions["com.openai"].interface;
if ([...interfaceMetadata.shortDescription].length > 30) problems.push("Plugin subtitle exceeds 30 characters");
const engine = readFileSync(join(root, "skills/impeccable/scripts/VERSION"), "utf8").trim();
if (!/^\d+\.\d+\.\d+$/.test(engine)) problems.push("Impeccable engine version is not a fixed semantic version");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`${names.size} distinct skills discovered; design links, dependencies, and license resources resolve. Impeccable engine: ${engine}.`);
