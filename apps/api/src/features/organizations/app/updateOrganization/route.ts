import { updateOrganizationHandler } from "./handler.js";
import {
  UpdateOrganizationBody,
  UpdateOrganizationBodySchema,
  UpdateOrganizationParams,
  UpdateOrganizationParamsSchema,
  UpdateOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { OrganizationRole } from "@repo/database/enums";

export const updateOrganizationRoute = defineRoute<{
  Params: UpdateOrganizationParams;
  Body: UpdateOrganizationBody;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["organizations"],
    summary: "Update organization",
    description:
      "Update organization data (requires active membership). Behavior varies by state: DRAFT updates in-place, APPROVED creates new submission, PENDING throws error, REJECTED creates new draft.",
    params: UpdateOrganizationParamsSchema,
    body: UpdateOrganizationBodySchema,
    response: {
      200: UpdateOrganizationResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      organization: {
        allowedRoles: [OrganizationRole.ADMIN],
      },
    },
  },
  handler: updateOrganizationHandler,
});
