import {
  GetCarbonInventoryMethodologyExportParamsSchema,
  GetCarbonInventoryMethodologyExportResponseSchema,
  type GetCarbonInventoryMethodologyExportParams,
  type GetCarbonInventoryMethodologyExportResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
import { getCarbonInventoryMethodologyExportHandler } from "./handler.js";

export const getCarbonInventoryMethodologyExportRoute: StandardRouteSignature =
  (fastify, options) => {
    fastify.get<{
      Params: GetCarbonInventoryMethodologyExportParams;
      Reply: GetCarbonInventoryMethodologyExportResponse;
    }>(
      "/:id/methodology-export",
      {
        schema: {
          tags: ["carbon-inventories"],
          summary:
            "Get the methodology export payload for the inventory's methodology version",
          description:
            "Returns the full methodology hierarchy of the version applied to the inventory so the web client can render the methodology workbook bundled in the ZIP. Response shape matches the admin `GET /methodologies/:id/export` byte-for-byte.",
          params: GetCarbonInventoryMethodologyExportParamsSchema,
          response: {
            200: GetCarbonInventoryMethodologyExportResponseSchema,
            401: ApiErrorResponseSchema,
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
      getCarbonInventoryMethodologyExportHandler
    );
  };
