import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.claude/**",
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  oxc: {
    // Override tsconfig jsx: "preserve" so Vitest/oxc can parse JSX in .tsx files
    jsx: { runtime: "automatic" },
  },
})
