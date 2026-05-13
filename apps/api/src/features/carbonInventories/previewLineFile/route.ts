import {
  PreviewLineFileParamsSchema,
  PreviewLineFileResponseSchema,
  type PreviewLineFileParams,
  type PreviewLineFileResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
import { previewLineFileHandler } from "./handler.js";

export const previewLineFileRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Params: PreviewLineFileParams;
    Reply: PreviewLineFileResponse;
  }>(
    "/:id/files/:uuid/preview",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get a temporary preview URL for a carbon inventory line file",
        params: PreviewLineFileParamsSchema,
        response: {
          200: PreviewLineFileResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
      preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)],
    },
    previewLineFileHandler
  );
};
