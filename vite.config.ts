import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Browser QA uses isolated project-local profiles/video; their locked temporary
  // files are not source and must never enter the development file watcher.
  server: { watch: { ignored: ["**/.release-test/**", "**/docs/media/**", "**/models/**"] } },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "ReactTimelineSequence",
      formats: ["es", "cjs"],
      fileName: format => format === "es" ? "index.js" : "index.cjs",
      cssFileName: "style",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "ReactJSXRuntime",
        },
      },
    },
  },
});
