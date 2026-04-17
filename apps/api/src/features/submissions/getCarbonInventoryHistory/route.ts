import { getCarbonInventoryHistoryHandler } from "./handler.js";
import {
  GetCarbonInventoryHistoryParams,
  GetCarbonInventoryHistoryParamsSchema,
  GetCarbonInventoryHistoryResponseSchema,
  OrganizationRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getCarbonInventoryHistoryRoute: StandardRouteSignature = (
  fastify
) => {
  fastify.get<{ Params: GetCarbonInventoryHistoryParams }>(
    "/carbon-inventory/:id/history",
    {
      schema: {
        tags: ["submissions"],
        summary: "Get carbon inventory submission history",
        description:
          "Get the history of submissions for a specific carbon inventory.",
        params: GetCarbonInventoryHistoryParamsSchema,
        response: {
          200: GetCarbonInventoryHistoryResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          requiredOrganizationRoles: [
            OrganizationRole.ADMIN,
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.VIEWER,
          ],
          canAdminsBypass: true,
        }),
      ],
    },
    getCarbonInventoryHistoryHandler
  );
};
