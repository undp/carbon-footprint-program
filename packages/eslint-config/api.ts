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
    files: ["**/*.{js,cjs,mjs,ts,tsx,cts,mts}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        projectService: false,
      },
    },
    rules: {
      "no-process-exit": "warn",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false }, // * Fastify handlers can return void
      ],
    },
  },
];
