import { resolve } from "path";
import { defineConfig } from "vite";

// biome-ignore lint/nursery/noDefaultExport: default export is required for Vite
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "index",
      fileName: "index",
    },
  },
});
