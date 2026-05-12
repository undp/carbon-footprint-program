import { getAllRequestsHandler } from "./handler.js";
import { GetAllAdminRequestsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllRequestsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-requests"],
        summary: "Get all requests",
        description: "Get all submission requests across all organizations",
        response: {
          200: GetAllAdminRequestsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllRequestsHandler
  );
};
