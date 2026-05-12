import { duplicateCarbonInventoryHandler } from "./handler.js";
import {
  DuplicateCarbonInventoryParamsSchema,
  DuplicateCarbonInventoryResponseSchema,
  type DuplicateCarbonInventoryParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const duplicateCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{ Params: DuplicateCarbonInventoryParams }>(
    "/:id/duplicate",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Duplicate a carbon inventory",
        description:
          "Duplicates a carbon inventory and all its ACTIVE children (lines, inputs, factors, results). Submissions are not duplicated.",
        params: DuplicateCarbonInventoryParamsSchema,
        response: {
          200: DuplicateCarbonInventoryResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          requiredOrganizationRoles: [
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.ADMIN,
          ],
        }),
      ],
    },
    duplicateCarbonInventoryHandler
  );
};
