import { config as baseConfig } from "@repo/eslint-config/base";
import type { Linter } from "eslint";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    ignores: ["src/generated"],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.eslint.json",
      },
    },
  },
  {
    rules: {
      "no-console": "off",
    },
  },
] satisfies Linter.Config[];
