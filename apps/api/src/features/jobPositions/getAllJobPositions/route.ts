import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllJobPositionsHandler } from "./handler.js";
import { GetAllJobPositionsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllJobPositionsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["job-positions"],
        summary: "Get all job positions",
        description: "Get all job positions",
        response: {
          200: GetAllJobPositionsResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllJobPositionsHandler
  );
};
