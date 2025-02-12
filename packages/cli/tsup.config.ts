import { defineConfig } from "tsup"

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  sourcemap: true,
  platform: 'node',
  minify: false,
  target: "esnext",
  outDir: "dist",
  external: [
    "@elizaos-plugins/sqlite",
    'better-sqlite3', 
    'node:fs'
    // Add other modules you want to externalize
  ],
})
