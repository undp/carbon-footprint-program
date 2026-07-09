import { defineRoute } from "@/routing/defineRoute.js";
import {
  GetAllAdminCountrySubsectorsQuery,
  GetAllAdminCountrySubsectorsQuerySchema,
  GetAllAdminCountrySubsectorsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminCountrySubsectorsHandler } from "./handler.js";

export const getAllAdminCountrySubsectorsRoute = defineRoute<{
  Querystring: GetAllAdminCountrySubsectorsQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-country-subsectors"],
    summary: "Get all country subsectors (admin view)",
    querystring: GetAllAdminCountrySubsectorsQuerySchema,
    response: {
      200: GetAllAdminCountrySubsectorsResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllAdminCountrySubsectorsHandler,
});
