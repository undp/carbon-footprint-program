import { updateCarbonInventorySubcategoriesHandler } from "./handler.js";
import {
  UpdateCarbonInventorySubcategoriesRequestSchema,
  UpdateCarbonInventorySubcategoriesResponseSchema,
  type UpdateCarbonInventorySubcategoriesRequest,
  UpdateCarbonInventorySubcategoriesParamsSchema,
  UpdateCarbonInventorySubcategoriesParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const updateCarbonInventorySubcategoriesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Params: UpdateCarbonInventorySubcategoriesParams;
    Body: UpdateCarbonInventorySubcategoriesRequest;
  }>(
    "/:id/subcategories",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update subcategories selection for a carbon inventory",
        description:
          "Add or remove subcategories from a carbon inventory. When removing a subcategory, it will only succeed if the subcategory has no non-empty lines. Empty lines will be deleted automatically.",
        params: UpdateCarbonInventorySubcategoriesParamsSchema,
        body: UpdateCarbonInventorySubcategoriesRequestSchema,
        response: {
          200: UpdateCarbonInventorySubcategoriesResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
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
    updateCarbonInventorySubcategoriesHandler
  );
};
