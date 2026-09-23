// Each client reads its own manifest, so the name, version, and description
// are written in four places. This fails when they disagree.
import { readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

const manifests = {
  "plugin.json (Agent Plugins: Codex, Copilot, VS Code)": read("plugin.json"),
  ".claude-plugin/plugin.json": read(".claude-plugin/plugin.json"),
  ".cursor-plugin/plugin.json": read(".cursor-plugin/plugin.json"),
  ".claude-plugin/marketplace.json plugins[0]": read(".claude-plugin/marketplace.json").plugins[0],
};

const fields = ["name", "version", "description"];
const problems = [];
for (const field of fields) {
  const values = new Set(Object.values(manifests).map((m) => m[field]));
  if (values.size !== 1) {
    const detail = Object.entries(manifests)
      .map(([file, m]) => `  ${file}: ${JSON.stringify(m[field])}`)
      .join("\n");
    problems.push(`${field} differs:\n${detail}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n\n"));
  process.exit(1);
}
console.log(`Manifests agree on ${fields.join(", ")}.`);
