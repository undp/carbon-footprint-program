import { getAllInitiativesHandler } from "./handler.js";
import { GetAllInitiativesResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllInitiativesRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-reduction-plan-initiatives"],
        summary: "Get all reduction plan initiatives",
        description:
          "Lists all active reduction plan initiatives ordered by category, subcategory, title",
        response: {
          200: GetAllInitiativesResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    getAllInitiativesHandler
  );
};
