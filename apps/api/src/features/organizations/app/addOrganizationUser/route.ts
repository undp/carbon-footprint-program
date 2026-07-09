import { OrganizationRole } from "@repo/database/enums";
import { addOrganizationUserHandler } from "./handler.js";
import {
  AddOrganizationUserBody,
  AddOrganizationUserBodySchema,
  AddOrganizationUserParams,
  AddOrganizationUserParamsSchema,
  AddOrganizationUserResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { organizationIdRequestExtractor } from "../../helpers.js";

export const addOrganizationUserRoute = defineRoute<{
  Params: AddOrganizationUserParams;
  Body: AddOrganizationUserBody;
}>({
  method: "POST",
  path: "/:organizationId/users",
  schema: {
    tags: ["organizations"],
    summary: "Add user to organization",
    description:
      "Add an existing user to an organization with a specific role. User must exist in the system.",
    params: AddOrganizationUserParamsSchema,
    body: AddOrganizationUserBodySchema,
    response: {
      201: AddOrganizationUserResponseSchema,
      400: ApiErrorResponseSchema,
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
        extractor: organizationIdRequestExtractor,
        requiredOrganizationRoles: [OrganizationRole.ADMIN],
      },
    },
  },
  handler: addOrganizationUserHandler,
});
