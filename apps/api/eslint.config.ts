import { apiConfig } from "@repo/eslint-config/api";
import type { Linter, Rule } from "eslint";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_NETWORK_IMPORTS = new Set([
  "openai",
  "node:https",
  "node:fetch",
  "https",
  "node-fetch",
  "axios",
]);

const noNetworkImportsInMock: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Mock LLM provider must not import any network module. The mock must be deterministic and offline.",
    },
    schema: [],
    messages: {
      forbidden:
        'Module "{{name}}" must not be imported by the mock LLM provider — keep it deterministic and offline.',
    },
  },
  create(context) {
    const reportIfForbidden = (node: Rule.Node, source: string | null) => {
      if (source && FORBIDDEN_NETWORK_IMPORTS.has(source)) {
        context.report({
          node,
          messageId: "forbidden",
          data: { name: source },
        });
      }
    };
    return {
      ImportDeclaration(node) {
        reportIfForbidden(
          node,
          typeof node.source.value === "string" ? node.source.value : null
        );
      },
      ExportAllDeclaration(node) {
        reportIfForbidden(
          node,
          typeof node.source.value === "string" ? node.source.value : null
        );
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          reportIfForbidden(
            node,
            typeof node.source.value === "string" ? node.source.value : null
          );
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Import" &&
          node.arguments[0]?.type === "Literal" &&
          typeof node.arguments[0].value === "string"
        ) {
          reportIfForbidden(node, node.arguments[0].value);
        }
      },
    };
  },
};

// Detect the AST equivalent of `Math.ceil(<expr>.length / 4)` — the canonical
// token-estimation formula. Only the shared estimateTokens.ts helper may
// inline it; every other module must import the helper.
const singleSourceEstimateTokens: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "All chatbot token-estimation formulas must call the shared estimateTokens() helper.",
    },
    schema: [],
    messages: {
      forbidden:
        "Do not inline `Math.ceil(...length / 4)` — import { estimateTokens } from the shared helper.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "Math" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "ceil" &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (
            arg.type === "BinaryExpression" &&
            arg.operator === "/" &&
            arg.right.type === "Literal" &&
            arg.right.value === 4 &&
            arg.left.type === "MemberExpression" &&
            arg.left.property.type === "Identifier" &&
            arg.left.property.name === "length"
          ) {
            context.report({ node, messageId: "forbidden" });
          }
        }
      },
    };
  },
};

const chatbotPlugin = {
  rules: {
    "no-network-imports-in-mock": noNetworkImportsInMock,
    "single-source-estimate-tokens": singleSourceEstimateTokens,
  },
};

const mockFiles = [
  resolve(__dirname, "src/features/chatbot/llmProvider/mock.ts"),
  resolve(__dirname, "src/features/chatbot/embeddingProvider/mock.ts"),
];

export default [
  ...apiConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.eslint.json",
      },
    },
    plugins: { chatbot: chatbotPlugin },
  },
  {
    files: mockFiles,
    rules: {
      "chatbot/no-network-imports-in-mock": "error",
    },
  },
  {
    files: ["src/features/chatbot/**/*.ts"],
    ignores: ["src/features/chatbot/llmProvider/estimateTokens.ts"],
    rules: {
      "chatbot/single-source-estimate-tokens": "error",
    },
  },
  {
    // CLI scripts are entry points; process.exit and the trailing fire-and-forget
    // main() call are idiomatic for this shape.
    files: ["scripts/**/*.ts"],
    rules: {
      "no-process-exit": "off",
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
] satisfies Linter.Config[];
