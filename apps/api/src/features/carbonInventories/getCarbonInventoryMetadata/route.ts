import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryMetadataHandler } from "./handler.js";
import {
  IdSchema,
  GetCarbonInventoryMetadataResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getCarbonInventoryMetadataRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/:id/metadata",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get carbon inventory metadata",
        description:
          "Retrieves the metadata attributes of a carbon inventory, including resolved organization, sector, size, and main activity names.",
        params: ParamsSchema,
        response: {
          200: GetCarbonInventoryMetadataResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getCarbonInventoryMetadataHandler
  );
};
