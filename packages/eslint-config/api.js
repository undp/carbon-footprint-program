import globals from "globals";
import { config as baseConfig } from "./base.js";
import tseslint from "typescript-eslint";

/**
 * A custom ESLint configuration for Node.js API.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const apiConfig = [
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
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "no-process-exit": "warn",
    },
  },
];
