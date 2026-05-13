import { getAllOrganizationsHandler } from "./handler.js";
import {
  GetAllOrganizationsQuery,
  GetAllOrganizationsQuerySchema,
  GetAllOrganizationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getAllOrganizationsRoute = defineRoute<{
  Querystring: GetAllOrganizationsQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-organizations"],
    summary: "Get all organizations",
    description:
      "Get all organizations with pagination, sorting, and filtering",
    querystring: GetAllOrganizationsQuerySchema,
    response: {
      200: GetAllOrganizationsResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllOrganizationsHandler,
});
