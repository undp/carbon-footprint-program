import { defineRoute } from "@/routing/defineRoute.js";
import { swapCategoryPositionsHandler } from "./handler.js";
import {
  SwapCategoryPositionsRequest,
  SwapCategoryPositionsRequestSchema,
  SwapCategoryPositionsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const swapCategoryPositionsRoute = defineRoute<{
  Body: SwapCategoryPositionsRequest;
}>({
  method: "POST",
  path: "/swap-positions",
  schema: {
    tags: ["categories"],
    summary: "Swap positions of two categories",
    description:
      "Atomically swaps the position values of two categories within the same methodology version",
    body: SwapCategoryPositionsRequestSchema,
    response: {
      201: SwapCategoryPositionsResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: swapCategoryPositionsHandler,
});
