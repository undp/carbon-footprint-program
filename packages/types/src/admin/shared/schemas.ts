import { z } from "zod";

/**
 * Tri-state filter applied to admin list endpoints whose underlying tables
 * support soft-delete via a `status` enum. Lives in `admin/shared` so the four
 * profiling-maintainer admin list schemas (sectors, subsectors, main
 * activities, organization sizes) can import it without creating cross-domain
 * coupling through the `countrySectors` module.
 */
export const AdminListStatusFilterSchema = z
  .enum(["active", "deleted", "all"])
  .default("active")
  .describe("Filtro por estado para la lista de admin");
