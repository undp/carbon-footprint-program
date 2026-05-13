import {
  GetOrganizationRecognitionsParams,
  GetOrganizationRecognitionsParamsSchema,
  GetOrganizationRecognitionsQuery,
  GetOrganizationRecognitionsQuerySchema,
  GetOrganizationRecognitionsResponseSchema,
} from "@repo/types";
import { getOrganizationRecognitionsHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getOrganizationRecognitionsRoute = defineRoute<{
  Params: GetOrganizationRecognitionsParams;
  Querystring: GetOrganizationRecognitionsQuery;
}>({
  method: "GET",
  path: "/:id/recognitions",
  schema: {
    tags: ["organizations"],
    summary: "Get organization recognitions",
    description:
      "Get all recognitions earned by an organization through approved carbon inventory submissions.",
    params: GetOrganizationRecognitionsParamsSchema,
    querystring: GetOrganizationRecognitionsQuerySchema,
    response: {
      200: GetOrganizationRecognitionsResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getOrganizationRecognitionsHandler,
});
