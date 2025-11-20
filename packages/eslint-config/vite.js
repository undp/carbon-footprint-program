import { config as baseConfig } from "./base.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import pluginRouter from "@tanstack/eslint-plugin-router";
import pluginQuery from "@tanstack/eslint-plugin-query";
import globals from "globals";

/**
 * ESLint configuration for Vite projects with React and TypeScript.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const viteJsConfig = [
  ...baseConfig,
  ...pluginRouter.configs["flat/recommended"],
  ...pluginQuery.configs["flat/recommended"],
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        projectService: true,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
    },
    ignores: ["**/*.gen.ts"],
  },
];
