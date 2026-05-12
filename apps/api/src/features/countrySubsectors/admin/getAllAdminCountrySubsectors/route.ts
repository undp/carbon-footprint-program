import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  GetAllAdminCountrySubsectorsQuerySchema,
  GetAllAdminCountrySubsectorsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminCountrySubsectorsHandler } from "./handler.js";

export const getAllAdminCountrySubsectorsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-country-subsectors"],
        summary: "Get all country subsectors (admin view)",
        querystring: GetAllAdminCountrySubsectorsQuerySchema,
        response: {
          200: GetAllAdminCountrySubsectorsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllAdminCountrySubsectorsHandler
  );
};
