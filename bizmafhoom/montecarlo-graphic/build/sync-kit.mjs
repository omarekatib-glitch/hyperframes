// Build step: copy the shared kit (../../kit) into vendor/kit so the render
// server — which only serves this project folder — can load it.
import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "kit");
const dst = join(here, "..", "vendor", "kit");
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, {
  recursive: true,
  filter: (p) => !p.endsWith(".md") && !p.endsWith("package.json"),
});
console.log(`kit synced → ${dst}`);
