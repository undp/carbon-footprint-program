import { defineRoute } from "@/routing/defineRoute.js";
import {
  GetAllAdminCountrySectorsQuery,
  GetAllAdminCountrySectorsQuerySchema,
  GetAllAdminCountrySectorsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminCountrySectorsHandler } from "./handler.js";

export const getAllAdminCountrySectorsRoute = defineRoute<{
  Querystring: GetAllAdminCountrySectorsQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-country-sectors"],
    summary: "Get all country sectors (admin view)",
    description:
      "Returns all country sectors with admin fields (status, description, audit fields, impactedChildren). Filter via ?status=active|deleted|all (default active).",
    querystring: GetAllAdminCountrySectorsQuerySchema,
    response: {
      200: GetAllAdminCountrySectorsResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllAdminCountrySectorsHandler,
});
