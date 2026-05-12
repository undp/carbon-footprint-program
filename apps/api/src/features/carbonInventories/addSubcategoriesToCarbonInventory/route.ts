import { addSubcategoriesToCarbonInventoryHandler } from "./handler.js";
import {
  AddSubcategoriesToCarbonInventoryBodySchema,
  AddSubcategoriesToCarbonInventoryResponseSchema,
  AddSubcategoriesToCarbonInventoryParamsSchema,
  type AddSubcategoriesToCarbonInventoryBody,
  type AddSubcategoriesToCarbonInventoryParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const addSubcategoriesToCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: AddSubcategoriesToCarbonInventoryParams;
    Body: AddSubcategoriesToCarbonInventoryBody;
  }>(
    "/:id/subcategories/add",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Add subcategories to a carbon inventory",
        description:
          "Add one or more subcategories to a carbon inventory by creating empty ACTIVE lines. Ignores subcategories that already have ACTIVE lines.",
        params: AddSubcategoriesToCarbonInventoryParamsSchema,
        body: AddSubcategoriesToCarbonInventoryBodySchema,
        response: {
          200: AddSubcategoriesToCarbonInventoryResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
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
    addSubcategoriesToCarbonInventoryHandler
  );
};
