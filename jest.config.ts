// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    // Mirror tsconfig paths
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        // Relax for tests — no need for strict Next.js settings
        module: "commonjs",
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  // Don't try to transform node_modules except idb (ESM)
  transformIgnorePatterns: ["/node_modules/(?!(idb)/)"],
  clearMocks: true,
  collectCoverageFrom: ["lib/fraud/**/*.ts"],
};

export default config;
