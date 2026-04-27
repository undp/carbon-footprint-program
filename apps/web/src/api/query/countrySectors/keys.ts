import type { AdminListStatusFilter } from "@repo/types";

/**
 * Query-key factory for country sectors. Segregated into:
 *   - `app`: public read endpoint (filtered to ACTIVE)
 *   - `admin`: full admin view with `status` filter
 *
 * Admin mutations should invalidate BOTH namespaces so consumer screens reflect catalog
 * changes immediately.
 *
 * `all` is preserved as a backward-compat alias for the public list (consumers that have
 * not yet migrated to `app.all`).
 */
export const countrySectorKeys = {
  all: ["countrySectors", "app"] as const,
  app: {
    all: ["countrySectors", "app"] as const,
  },
  admin: {
    all: ["countrySectors", "admin"] as const,
    list: (status: AdminListStatusFilter) =>
      ["countrySectors", "admin", "list", status] as const,
  },
};
