import { FastifyZodInstance } from "@/types/fastify.js";
import {
  UpdateOrganizationParamsSchema,
  UpdateOrganizationRequestSchema,
  UpdateOrganizationResponseSchema,
} from "@repo/types";
import { updateOrganizationHandler } from "./handler.js";

export const updateOrganizationRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        params: UpdateOrganizationParamsSchema,
        body: UpdateOrganizationRequestSchema,
        response: {
          200: UpdateOrganizationResponseSchema,
        },
      },
    },
    updateOrganizationHandler
  );
};
