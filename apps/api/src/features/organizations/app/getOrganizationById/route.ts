import { getOrganizationByIdHandler } from "./handler.js";
import {
  GetOrganizationByIdParams,
  GetOrganizationByIdParamsSchema,
  GetOrganizationByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getOrganizationByIdRoute = defineRoute<{
  Params: GetOrganizationByIdParams;
}>({
  method: "GET",
  path: "/:id",
  schema: {
    tags: ["organizations"],
    summary: "Get organization by ID",
    description: "Get organization details by ID (requires active membership)",
    params: GetOrganizationByIdParamsSchema,
    response: {
      200: GetOrganizationByIdResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      options: { canAdminsBypass: true },
    },
  },
  handler: getOrganizationByIdHandler,
});
