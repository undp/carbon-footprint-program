import { getAllReductionPlanInitiativesHandler } from "./handler.js";
import {
  GetAllReductionPlanInitiativesQuery,
  GetAllReductionPlanInitiativesQuerySchema,
  GetAllReductionPlanInitiativesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getAllReductionPlanInitiativesRoute = defineRoute<{
  Querystring: GetAllReductionPlanInitiativesQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-reduction-plan-initiatives"],
    summary: "Get all reduction plan initiatives",
    description:
      "Lists all active reduction plan initiatives ordered by category, subcategory, title. Optionally filtered by methodologyVersionId.",
    querystring: GetAllReductionPlanInitiativesQuerySchema,
    response: {
      200: GetAllReductionPlanInitiativesResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllReductionPlanInitiativesHandler,
});
