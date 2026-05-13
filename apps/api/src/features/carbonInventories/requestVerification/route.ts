import { requestVerificationHandler } from "./handler.js";
import {
  RequestVerificationBody,
  RequestVerificationBodySchema,
  RequestVerificationParams,
  RequestVerificationParamsSchema,
  RequestVerificationResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const requestVerificationRoute = defineRoute<{
  Params: RequestVerificationParams;
  Body: RequestVerificationBody;
}>({
  method: "POST",
  path: "/:id/request-verification",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Request verification submission for a carbon inventory",
    description:
      "Creates a new submission of type VERIFICATION for the specified carbon inventory",
    params: RequestVerificationParamsSchema,
    body: RequestVerificationBodySchema,
    response: {
      200: RequestVerificationResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "carbonInventory",
      carbonInventory: {
        requiredOrganizationRoles: [
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.ADMIN,
        ],
      },
    },
  },
  handler: requestVerificationHandler,
});
