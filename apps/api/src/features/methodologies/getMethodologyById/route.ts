import { StandardRouteSignature } from "@/routes/api/index.js";
import { getMethodologyByIdHandler } from "./handler.js";
import {
  GetMethodologyByIdParamsSchema,
  GetMethodologyByIdResponseSchema,
  type GetMethodologyByIdParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getMethodologyByIdRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Params: GetMethodologyByIdParams;
  }>(
    "/:id",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Get methodology by ID",
        description:
          "Get a methodology by its ID, including its active categories (ordered by position) and their active subcategories (ordered by name)",
        params: GetMethodologyByIdParamsSchema,
        response: {
          200: GetMethodologyByIdResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getMethodologyByIdHandler
  );
};
