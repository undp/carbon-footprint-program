import { getCarbonInventoryMetadataHandler } from "./handler.js";
import {
  IdSchema,
  GetCarbonInventoryMetadataResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getCarbonInventoryMetadataRoute: StandardRouteSignature = (
  fastify,
  options
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
      config: {
        public: options?.public ?? false,
      },
    },
    getCarbonInventoryMetadataHandler
  );
};
