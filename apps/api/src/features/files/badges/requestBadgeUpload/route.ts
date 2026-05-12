import {
  RequestBadgeUploadBodySchema,
  RequestBadgeUploadParamsSchema,
  RequestBadgeUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { badgeRequestUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const badgeRequestUploadRoute: StandardRouteSignature = (
  fastify,
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
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    badgeRequestUploadHandler
  );
};
