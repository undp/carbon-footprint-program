import {
  GetCarbonInventoryFilesManifestParamsSchema,
  GetCarbonInventoryFilesManifestResponseSchema,
  type GetCarbonInventoryFilesManifestParams,
  type GetCarbonInventoryFilesManifestResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
import { getCarbonInventoryFilesManifestHandler } from "./handler.js";

export const getCarbonInventoryFilesManifestRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Params: GetCarbonInventoryFilesManifestParams;
    Reply: GetCarbonInventoryFilesManifestResponse;
  }>(
    "/:id/files-manifest",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "List signed SAS URLs for every active line file",
        description:
          "Returns one entry per active-line active-file attachment, each signed with a single user-delegation-key SAS so the browser can bulk-download them directly from Azure for ZIP assembly.",
        params: GetCarbonInventoryFilesManifestParamsSchema,
        response: {
          200: GetCarbonInventoryFilesManifestResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
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
    getCarbonInventoryFilesManifestHandler
  );
};
