import { approveRequestHandler } from "./handler.js";
import {
  ApproveRequestParamsSchema,
  ApproveRequestBodySchema,
  ApproveRequestResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const approveRequestRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/approve",
    {
      schema: {
        tags: ["admin-requests"],
        summary: "Approve a request",
        description: "Approve a pending submission request",
        params: ApproveRequestParamsSchema,
        body: ApproveRequestBodySchema,
        response: {
          200: ApproveRequestResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    approveRequestHandler
  );
};
