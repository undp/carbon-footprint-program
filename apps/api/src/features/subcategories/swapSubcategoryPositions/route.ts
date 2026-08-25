import { defineRoute } from "@/routing/defineRoute.js";
import { swapSubcategoryPositionsHandler } from "./handler.js";
import {
  SwapSubcategoryPositionsRequest,
  SwapSubcategoryPositionsRequestSchema,
  SwapSubcategoryPositionsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const swapSubcategoryPositionsRoute = defineRoute<{
  Body: SwapSubcategoryPositionsRequest;
}>({
  method: "POST",
  path: "/swap-positions",
  schema: {
    tags: ["subcategories"],
    summary: "Swap positions of two subcategories",
    description:
      "Atomically swaps the position values of two subcategories within the same category",
    body: SwapSubcategoryPositionsRequestSchema,
    response: {
      201: SwapSubcategoryPositionsResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: swapSubcategoryPositionsHandler,
});
