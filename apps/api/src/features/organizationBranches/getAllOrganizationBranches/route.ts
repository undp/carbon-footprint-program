import { getAllOrganizationBranchesHandler } from "./handler.js";
import {
  GetAllOrganizationBranchesQuerySchema,
  GetAllOrganizationBranchesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllOrganizationBranchesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["organization-branches"],
        summary: "Get all organization branches",
        description:
          "Get all branches for an organization, filtered by organizationId",
        querystring: GetAllOrganizationBranchesQuerySchema,
        response: {
          200: GetAllOrganizationBranchesResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getAllOrganizationBranchesHandler
  );
};
