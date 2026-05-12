import { StandardRouteSignature } from "@/routes/api/index.js";
import { swapCategoryPositionsHandler } from "./handler.js";
import {
  SwapCategoryPositionsRequestSchema,
  SwapCategoryPositionsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const swapCategoryPositionsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/swap-positions",
    {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    swapCategoryPositionsHandler
  );
};
