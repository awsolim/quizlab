import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(dir, entry.name))
      : /\.(ts|tsx|css)$/.test(entry.name) && !entry.name.includes(".test.")
        ? [join(dir, entry.name)]
        : [],
  );
}
const hash = createHash("sha256");
for (const file of [
  ...sourceFiles(join(root, "src")),
  join(root, "public/question-bank.schema.json"),
  join(root, "package-lock.json"),
  join(root, "vite.config.ts"),
].sort()) {
  hash.update(relative(root, file));
  hash.update(readFileSync(file));
}
const buildId = hash.digest("hex").slice(0, 16);
export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "quizlab-build-version",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "app-version.json",
          source: JSON.stringify({ buildId }),
        });
      },
      configureServer(server) {
        server.middlewares.use("/app-version.json", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify({ buildId }));
        });
      },
    },
  ],
  define: { __QUIZLAB_BUILD_ID__: JSON.stringify(buildId) },
  server: { headers: { "Cache-Control": "no-store" } },
  preview: { headers: { "Cache-Control": "no-store" } },
});
