import { rejectRequestHandler } from "./handler.js";
import {
  RejectRequestParamsSchema,
  RejectRequestBodySchema,
  RejectRequestResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const rejectRequestRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/reject",
    {
      schema: {
        tags: ["admin-requests"],
        summary: "Reject a request",
        description: "Reject a pending submission request",
        params: RejectRequestParamsSchema,
        body: RejectRequestBodySchema,
        response: {
          200: RejectRequestResponseSchema,
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
    rejectRequestHandler
  );
};
