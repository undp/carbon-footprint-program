import {
  GetOrganizationRecognitionsParamsSchema,
  GetOrganizationRecognitionsQuerySchema,
  GetOrganizationRecognitionsResponseSchema,
  type GetOrganizationRecognitionsParams,
  type GetOrganizationRecognitionsQuery,
} from "@repo/types";
import { getOrganizationRecognitionsHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getOrganizationRecognitionsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Params: GetOrganizationRecognitionsParams;
    Querystring: GetOrganizationRecognitionsQuery;
  }>(
    "/:id/recognitions",
    {
      schema: {
        tags: ["organizations"],
        summary: "Get organization recognitions",
        description:
          "Get all recognitions earned by an organization through approved carbon inventory submissions.",
        params: GetOrganizationRecognitionsParamsSchema,
        querystring: GetOrganizationRecognitionsQuerySchema,
        response: {
          200: GetOrganizationRecognitionsResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getOrganizationRecognitionsHandler
  );
};
