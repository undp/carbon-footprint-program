import { getCarbonInventoryAccessHandler } from "./handler.js";
import {
  GetCarbonInventoryAccessParams,
  GetCarbonInventoryAccessParamsSchema,
  GetCarbonInventoryAccessResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getCarbonInventoryAccessRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetCarbonInventoryAccessParams }>(
    "/:id/access",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get carbon inventory access",
        description:
          "Resolves whether the requesting user can edit a carbon inventory. Access (read) itself is enforced by the preHandler — a 403 here means the caller has no read access at all.",
        params: GetCarbonInventoryAccessParamsSchema,
        response: {
          200: GetCarbonInventoryAccessResponseSchema,
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
    getCarbonInventoryAccessHandler
  );
};
