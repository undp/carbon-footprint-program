import { selfDeclareCarbonInventoryHandler } from "./handler.js";
import {
  OrganizationRole,
  SelfDeclareCarboInventoryParamsSchema,
  SelfDeclareCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const selfDeclareCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/self-declare",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Self-declare a carbon inventory",
        description:
          "Marks a carbon inventory as self-declared and optionally creates an auto-approved submission based on system parameters",
        params: SelfDeclareCarboInventoryParamsSchema,
        response: {
          200: SelfDeclareCarbonInventoryResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
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
    selfDeclareCarbonInventoryHandler
  );
};
