import { duplicateCarbonInventoryHandler } from "./handler.js";
import {
  DuplicateCarbonInventoryParamsSchema,
  DuplicateCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const duplicateCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/duplicate",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Duplicate a carbon inventory",
        description:
          "Duplicates a carbon inventory and all its ACTIVE children (lines, inputs, factors, results). Submissions are not duplicated.",
        params: DuplicateCarbonInventoryParamsSchema,
        response: {
          201: DuplicateCarbonInventoryResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    duplicateCarbonInventoryHandler
  );
};
