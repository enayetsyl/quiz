import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/tests/**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "lcov"],
      provider: "v8"
    }
  },
  resolve: {
    alias: {
      "@quizgen/shared": resolve(__dirname, "../../packages/shared/src"),
      "@tanstack/react-query": resolve(
        __dirname,
        "../../packages/tanstack-react-query/src"
      ),
      "@tanstack/react-query-devtools": resolve(
        __dirname,
        "../../packages/tanstack-react-query-devtools/src"
      ),
      axios: resolve(__dirname, "../../packages/axios/src"),
      "@": resolve(__dirname, "./src")
    }
  }
});
