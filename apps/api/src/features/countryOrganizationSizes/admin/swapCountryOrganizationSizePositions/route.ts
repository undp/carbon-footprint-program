import { defineRoute } from "@/routing/defineRoute.js";
import {
  SwapCountryOrganizationSizePositionsRequest,
  SwapCountryOrganizationSizePositionsRequestSchema,
  SwapCountryOrganizationSizePositionsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { swapCountryOrganizationSizePositionsHandler } from "./handler.js";

export const swapCountryOrganizationSizePositionsRoute = defineRoute<{
  Body: SwapCountryOrganizationSizePositionsRequest;
}>({
  method: "POST",
  path: "/swap-positions",
  schema: {
    tags: ["admin-country-organization-sizes"],
    summary: "Swap positions of two country organization sizes",
    description:
      "Atomically swaps the position values of two ACTIVE organization sizes belonging to the same country, used by the admin maintainer manual reorder.",
    body: SwapCountryOrganizationSizePositionsRequestSchema,
    response: {
      201: SwapCountryOrganizationSizePositionsResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: swapCountryOrganizationSizePositionsHandler,
});
