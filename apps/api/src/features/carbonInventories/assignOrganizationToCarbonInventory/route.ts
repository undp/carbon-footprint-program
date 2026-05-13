import { assignOrganizationToCarbonInventoryHandler } from "./handler.js";
import {
  AssignOrganizationToCarbonInventoryParamsSchema,
  AssignOrganizationToCarbonInventoryResponseSchema,
  type AssignOrganizationToCarbonInventoryParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  idRequestExtractor,
  type IdExtractor,
} from "@/helpers/idRequestExtractor.js";
import { OrganizationRole } from "@repo/database/enums";

const organizationIdRequestExtractor: IdExtractor<{
  organizationId: string;
}> = (request) => request.params.organizationId;

export const assignOrganizationToCarbonInventoryRoute: StandardRouteSignature =
  (fastify) => {
    fastify.post<{
      Params: AssignOrganizationToCarbonInventoryParams;
    }>(
      "/:id/assign-organization/:organizationId",
      {
        schema: {
          tags: ["carbon-inventories"],
          summary: "Associate an organization to a draft carbon inventory",
          description:
            "Assigns an organization to a carbon inventory that does not yet have one. The user must be an active CONTRIBUTOR or ADMIN of the target organization.",
          params: AssignOrganizationToCarbonInventoryParamsSchema,
          response: {
            200: AssignOrganizationToCarbonInventoryResponseSchema,
            400: ApiErrorResponseSchema,
            403: ApiErrorResponseSchema,
            404: ApiErrorResponseSchema,
            422: ApiErrorResponseSchema,
          },
        },
        preHandler: [
          fastify.requireCarbonInventoryAccess(idRequestExtractor),
          fastify.requireOrganizationRole(organizationIdRequestExtractor, {
            allowedRoles: [
              OrganizationRole.CONTRIBUTOR,
              OrganizationRole.ADMIN,
            ],
          }),
        ],
      },
      assignOrganizationToCarbonInventoryHandler
    );
  };
