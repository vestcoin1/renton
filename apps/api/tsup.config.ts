import { defineConfig } from "tsup";

// Bundles the server into dist/server.js. Workspace packages (renton-core, renton-shared)
// ship TypeScript source, so they are compiled in; npm dependencies stay external.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^renton-/],
});
