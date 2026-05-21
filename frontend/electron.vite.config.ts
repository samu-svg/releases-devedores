import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: "main/main.ts",
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: "main/preload/index.ts",
      },
    },
  },
  renderer: {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:4000/api"),
    },
    root: ".",
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: "index.html",
      },
    },
  },
});
