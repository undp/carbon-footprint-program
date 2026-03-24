import { selfDeclareCarbonInventoryHandler } from "./handler.js";
import {
  SelfDeclareCarboInventoryParamsSchema,
  SelfDeclareCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const selfDeclareCarbonInventoryRoute: StandardRouteSignature = (
  fastify
) => {
  fastify.post(
    "/:id/self-declare",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Self-declare a carbon inventory",
        description:
          "Marks a carbon inventory as self-declared and optionally creates an auto-approved submission based on system parameters",
        params: SelfDeclareCarboInventoryParamsSchema,
        response: {
          200: SelfDeclareCarbonInventoryResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams
        ),
      ],
    },
    selfDeclareCarbonInventoryHandler
  );
};
