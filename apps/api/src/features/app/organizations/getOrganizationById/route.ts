import type { FastifyZodInstance } from "@/types/fastify.js";
import { getOrganizationByIdHandler } from "./handler.js";
import {
  GetOrganizationByIdParamsSchema,
  GetOrganizationByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getOrganizationByIdRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Get organization by ID",
        description:
          "Get organization information for display and form editing. Requires active membership.",
        params: GetOrganizationByIdParamsSchema,
        response: {
          200: GetOrganizationByIdResponseSchema,
          400: ApiErrorResponseSchema, // Invalid ID format
          403: ApiErrorResponseSchema, // No membership
          404: ApiErrorResponseSchema, // Not found
        },
      },
    },
    getOrganizationByIdHandler
  );
};
