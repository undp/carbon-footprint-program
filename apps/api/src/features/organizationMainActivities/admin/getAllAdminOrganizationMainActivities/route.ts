import { defineRoute } from "@/routing/defineRoute.js";
import {
  GetAllAdminOrganizationMainActivitiesQuery,
  GetAllAdminOrganizationMainActivitiesQuerySchema,
  GetAllAdminOrganizationMainActivitiesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminOrganizationMainActivitiesHandler } from "./handler.js";

export const getAllAdminOrganizationMainActivitiesRoute = defineRoute<{
  Querystring: GetAllAdminOrganizationMainActivitiesQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-organization-main-activities"],
    summary: "Get all organization main activities (admin view)",
    querystring: GetAllAdminOrganizationMainActivitiesQuerySchema,
    response: {
      200: GetAllAdminOrganizationMainActivitiesResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllAdminOrganizationMainActivitiesHandler,
});
