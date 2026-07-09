import { GetCurrentTermsConditionsResponseSchema } from "@repo/types";
import { getCurrentTermsConditionsHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

/**
 * Metadata about the current Terms & Conditions PDF (just `fileName`).
 *
 * The actual PDF is served by GET /api/terms-conditions/file. This metadata
 * endpoint exists only so the public landing page can decide whether a T&C
 * link should be rendered at all (graceful UX when none has been seeded yet).
 */
export const getCurrentTermsConditionsRoute = defineRoute({
  method: "GET",
  path: "/current",
  schema: {
    tags: ["terms-conditions"],
    summary: "Get metadata about the current Terms & Conditions PDF",
    description:
      "Returns the original file name of the currently published Terms & Conditions PDF, or null when none has been uploaded yet. The PDF itself is streamed by GET /api/terms-conditions/file. Public endpoint.",
    response: {
      200: GetCurrentTermsConditionsResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getCurrentTermsConditionsHandler,
});
