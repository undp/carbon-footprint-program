import { defineRoute } from "@/routing/defineRoute.js";
import {
  UpdateOrganizationMainActivityParams,
  UpdateOrganizationMainActivityParamsSchema,
  UpdateOrganizationMainActivityRequest,
  UpdateOrganizationMainActivityRequestSchema,
  UpdateOrganizationMainActivityResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateOrganizationMainActivityHandler } from "./handler.js";

export const updateOrganizationMainActivityRoute = defineRoute<{
  Params: UpdateOrganizationMainActivityParams;
  Body: UpdateOrganizationMainActivityRequest;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["admin-organization-main-activities"],
    summary: "Update an organization main activity",
    params: UpdateOrganizationMainActivityParamsSchema,
    body: UpdateOrganizationMainActivityRequestSchema,
    response: {
      200: UpdateOrganizationMainActivityResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateOrganizationMainActivityHandler,
});
