import { getAllReductionPlanInitiativesHandler } from "./handler.js";
import {
  GetAllReductionPlanInitiativesQuerySchema,
  GetAllReductionPlanInitiativesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllReductionPlanInitiativesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllReductionPlanInitiativesHandler
  );
};
