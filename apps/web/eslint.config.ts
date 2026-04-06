import { webConfig } from "@repo/eslint-config/web";
import type { Linter } from "eslint";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...webConfig,
  {
    ignores: ["src/**/__tests__/**"],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.eslint.json",
      },
    },
  },
] satisfies Linter.Config[];
