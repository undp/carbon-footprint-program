import {
  RequestBadgeUploadBodySchema,
  RequestBadgeUploadParamsSchema,
  RequestBadgeUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeRequestUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const badgeRequestUploadRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance,
  options
) => {
  fastify.post(
    "/:badgeType/request-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Request a temporary upload URL for a badge",
        params: RequestBadgeUploadParamsSchema,
        body: RequestBadgeUploadBodySchema,
        response: {
          200: RequestBadgeUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    badgeRequestUploadHandler
  );
};
