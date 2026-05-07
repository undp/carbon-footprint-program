import { getCarbonInventoryMetadataHandler } from "./handler.js";
import {
  GetCarbonInventoryMetadataParams,
  GetCarbonInventoryMetadataParamsSchema,
  GetCarbonInventoryMetadataResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getCarbonInventoryMetadataRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetCarbonInventoryMetadataParams }>(
    "/:id/metadata",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get carbon inventory metadata",
        description:
          "Retrieves the metadata attributes of a carbon inventory, including resolved organization, sector, size, and main activity names.",
        params: GetCarbonInventoryMetadataParamsSchema,
        response: {
          200: GetCarbonInventoryMetadataResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          canAdminsBypass: true,
        }),
      ],
    },
    getCarbonInventoryMetadataHandler
  );
};
