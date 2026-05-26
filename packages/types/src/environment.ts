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
