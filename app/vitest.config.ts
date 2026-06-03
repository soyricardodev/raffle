import viteTsConfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [viteTsConfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      EMAIL_FROM: "noreply@rifas.test",
      EMAIL_FROM_NAME: "Rifas Test",
    },
    /** Tests de BD comparten un archivo SQLite local — no paralelizar archivos. */
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
