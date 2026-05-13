import { requestCalculationHandler } from "./handler.js";
import {
  RequestCalculationParams,
  RequestCalculationParamsSchema,
  RequestCalculationResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const requestCalculationRoute = defineRoute<{
  Params: RequestCalculationParams;
}>({
  method: "POST",
  path: "/:id/request-calculation",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Request calculation submission for a carbon inventory",
    description:
      "Creates a new submission of type CALCULATION for the specified carbon inventory",
    params: RequestCalculationParamsSchema,
    response: {
      200: RequestCalculationResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "carbonInventory",
      options: {
        requiredOrganizationRoles: [
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.ADMIN,
        ],
      },
    },
  },
  handler: requestCalculationHandler,
});
