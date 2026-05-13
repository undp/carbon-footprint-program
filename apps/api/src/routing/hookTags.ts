/**
 * Hooks built by `buildHooks` are tagged with a non-enumerable symbol so the
 * route-security validator can identify each hook's purpose at boot time.
 * Without this, all decorator returns (`requireAuth`, `requireRoles`,
 * `requireCarbonInventoryAccess`, …) look like anonymous async functions and
 * the validator can only check presence — not which kind is present.
 *
 * The tag is a write-only signal; nothing reads it at request time, and Fastify
 * itself ignores the extra property.
 */
export type HookKind =
  | "requireAuth"
  | "requireRoles"
  | "requireOrganizationRole"
  | "requireCarbonInventoryAccess"
  | "requireReductionProjectAccess";

const HOOK_KIND_SYMBOL = Symbol.for("huella.routeSecurity.hookKind");

type TaggedHook = Record<typeof HOOK_KIND_SYMBOL, HookKind>;

/**
 * Stamp a hook with its kind. Mutates and returns the same function reference.
 * Safe to call multiple times (idempotent — the tag is overwritten, not stacked).
 */
export function tagHook<F extends object>(hook: F, kind: HookKind): F {
  Object.defineProperty(hook, HOOK_KIND_SYMBOL, {
    value: kind,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return hook;
}

/**
 * Read the kind tag from a hook. Returns `undefined` when the hook was not
 * produced by `buildHooks` (e.g. legacy manually-registered routes or
 * third-party plugins).
 */
export function getHookKind(hook: unknown): HookKind | undefined {
  if (typeof hook !== "function" && typeof hook !== "object") return undefined;
  if (hook === null) return undefined;
  return (hook as TaggedHook)[HOOK_KIND_SYMBOL];
}
