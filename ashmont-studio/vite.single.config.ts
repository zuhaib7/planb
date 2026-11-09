// Builds the whole app into ONE self-contained HTML file (code, styles and images inlined)
// that opens by double-click, no server needed. Output: dist-single/index.html
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  base: "./",
  build: {
    outDir: "dist-single",
    target: "es2022",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER, // inline every image as data
    chunkSizeWarningLimit: 20_000,
    cssCodeSplit: false,
  },
});
