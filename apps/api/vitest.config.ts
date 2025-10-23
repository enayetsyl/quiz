import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      provider: "v8"
    }
  },
  resolve: {
    alias: {
      "@quizgen/shared": resolve(__dirname, "../../packages/shared/src"),
      "@": resolve(__dirname, "./src")
    }
  }
});
