import { requestOrganizationAccreditationHandler } from "./handler.js";
import {
  RequestOrganizationAccreditationBody,
  RequestOrganizationAccreditationBodySchema,
  RequestOrganizationAccreditationParams,
  RequestOrganizationAccreditationParamsSchema,
  RequestOrganizationAccreditationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { OrganizationRole } from "@repo/database/enums";

export const requestOrganizationAccreditationRoute = defineRoute<{
  Params: RequestOrganizationAccreditationParams;
  Body: RequestOrganizationAccreditationBody;
}>({
  method: "POST",
  path: "/:id/request-accreditation",
  schema: {
    tags: ["organizations"],
    summary: "Request organization accreditation",
    description:
      "Submit organization for accreditation (requires active membership)",
    params: RequestOrganizationAccreditationParamsSchema,
    body: RequestOrganizationAccreditationBodySchema,
    response: {
      200: RequestOrganizationAccreditationResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      options: {
        requiredOrganizationRoles: [OrganizationRole.ADMIN],
      },
    },
  },
  handler: requestOrganizationAccreditationHandler,
});
