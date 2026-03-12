import type { CarbonInventoryIdExtractor } from "@/plugins/app/carbonInventoryAuthorizationPlugin.js";

/**
 * Extracts carbon inventory ID from request params (`:id`).
 * Use for routes like `/:id`, `/:id/duplicate`, `/:id/subcategories`, etc.
 */
export const extractCarbonInventoryIdFromParams: CarbonInventoryIdExtractor = (
  request
) => request.params.id;
