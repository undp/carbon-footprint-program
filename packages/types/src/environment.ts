/**
 * This package is consumed as source (`"types": "./src/index.ts"`), so this
 * file is type-checked under each consumer's tsconfig — including apps/web,
 * a browser app whose compilation has no node globals: TypeScript 6.0 changed
 * the default of `types` to `[]`, so `node_modules/@types` (and with it the
 * global `process` from @types/node) is no longer auto-included.
 *
 * Reading `process` off `globalThis` with a local structural type keeps this
 * file free of any @types/node requirement while behaving exactly like the
 * old `typeof process !== "undefined"` guard at runtime (node: same object;
 * browser: undefined).
 *
 * Alternatives rejected: `"types": ["node"]` in browser consumers or a
 * `/// <reference types="node" />` here would leak all node globals into the
 * web compilation; exporting compiled .d.ts instead of source would require
 * building this package before every consumer type-check.
 */
type ProcessLike = { env: Record<string, string | undefined> };

const getEnv = (key: string): string | undefined => {
  const proc = (globalThis as { process?: ProcessLike }).process;
  return proc?.env[key];
};

const NODE_ENV = getEnv("NODE_ENV") ?? "production";

export const IS_DEVELOPMENT = NODE_ENV === "development";

/**
 * When true, relaxes required-field validation (e.g. minLength=0) so developers
 * can submit forms without filling every field during local testing.
 * Set LOCAL_BYPASS_REQUIRED_FIELDS=true in your .envrc to enable.
 */
export const LOCAL_BYPASS_REQUIRED_FIELDS =
  getEnv("LOCAL_BYPASS_REQUIRED_FIELDS") === "true";
