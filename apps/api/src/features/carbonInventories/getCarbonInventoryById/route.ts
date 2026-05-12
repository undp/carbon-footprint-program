import { getCarbonInventoryByIdHandler } from "./handler.js";
import {
  GetCarbonInventoryByIdParams,
  GetCarbonInventoryByIdParamsSchema,
  GetCarbonInventoryByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getCarbonInventoryByIdRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetCarbonInventoryByIdParams }>(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get a carbon inventory by ID",
        description: "Get a single carbon inventory by its ID",
        params: GetCarbonInventoryByIdParamsSchema,
        response: {
          200: GetCarbonInventoryByIdResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          canAdminsBypass: true,
        }),
      ],
    },
    getCarbonInventoryByIdHandler
  );
};
