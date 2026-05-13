import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { streamCurrentTermsConditionsHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

/**
 * Public, stable URL that streams the current Terms & Conditions PDF.
 *
 * The response body is a binary stream (the PDF). We intentionally do NOT
 * declare a 200 response schema — fastify-type-provider-zod would otherwise
 * try to JSON-validate the binary body. Only error responses are validated.
 */
export const streamCurrentTermsConditionsRoute = defineRoute({
  method: "GET",
  path: "/file",
  schema: {
    tags: ["terms-conditions"],
    summary: "Stream the current Terms & Conditions PDF",
    description:
      "Returns the bytes of the PDF currently published as Terms & Conditions, with a stable URL that does not expire. Returns 404 when no T&C has been uploaded yet. Public endpoint.",
    response: {
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: streamCurrentTermsConditionsHandler,
});
