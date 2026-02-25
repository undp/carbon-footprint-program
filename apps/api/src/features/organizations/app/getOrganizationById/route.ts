import type { FastifyRequest } from "fastify";
import { getOrganizationByIdHandler } from "./handler.js";
import {
  GetOrganizationByIdParamsSchema,
  GetOrganizationByIdResponseSchema,
  GetOrganizationByIdParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { OrganizationRole } from "@repo/database";

// Extractor function for organization ID
const extractOrganizationId = async (request: FastifyRequest) =>
  Promise.resolve((request.params as GetOrganizationByIdParams).id);

export const getOrganizationByIdRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get<{
    Params: GetOrganizationByIdParams;
  }>(
    "/:id",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Get organization by ID",
        description:
          "Get organization details by ID (requires active membership)",
        params: GetOrganizationByIdParamsSchema,
        response: {
          200: GetOrganizationByIdResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireOrganizationRole(extractOrganizationId, [
          OrganizationRole.ORGANIZATION_ADMIN,
          OrganizationRole.ORGANIZATION_CONTRIBUTOR,
          OrganizationRole.VIEWER,
        ]),
      ],
    },
    getOrganizationByIdHandler
  );
};
