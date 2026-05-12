import { getAllOrganizationsHandler } from "./handler.js";
import {
  GetAllOrganizationsQuerySchema,
  GetAllOrganizationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllOrganizationsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-organizations"],
        summary: "Get all organizations",
        description:
          "Get all organizations with pagination, sorting, and filtering",
        querystring: GetAllOrganizationsQuerySchema,
        response: {
          200: GetAllOrganizationsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllOrganizationsHandler
  );
};
