import { duplicateCarbonInventoryHandler } from "./handler.js";
import {
  DuplicateCarbonInventoryParamsSchema,
  DuplicateCarbonInventoryResponseSchema,
  type DuplicateCarbonInventoryParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const duplicateCarbonInventoryRoute: StandardRouteSignature = (
  fastify
) => {
  fastify.post<{ Params: DuplicateCarbonInventoryParams }>(
    "/:id/duplicate",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Duplicate a carbon inventory",
        description:
          "Duplicates a carbon inventory and all its ACTIVE children (lines, inputs, factors, results). Submissions are not duplicated.",
        params: DuplicateCarbonInventoryParamsSchema,
        response: {
          200: DuplicateCarbonInventoryResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams
        ),
      ],
    },
    duplicateCarbonInventoryHandler
  );
};
