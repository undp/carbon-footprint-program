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
        tags: ["admin-organizations"],
        summary: "Get organization by ID",
        description: "Get organization details by ID (admin access)",
        params: GetOrganizationByIdParamsSchema,
        response: {
          200: GetOrganizationByIdResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getOrganizationByIdHandler
  );
};
