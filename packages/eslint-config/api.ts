import globals from "globals";
import { config as baseConfig } from "./base.ts";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";

/**
 * A custom ESLint configuration for Node.js API.
 */
export const apiConfig: Linter.Config[] = [
  ...baseConfig,
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        projectService: true,
      },
    },
    rules: {
      "no-process-exit": "warn",
    },
  },
];
