import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base:
    process.env.NODE_ENV === "production" && process.env.GITHUB_PAGES === "true"
      ? "/ubuntu-school-network/" // GitHub repository name
      : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
