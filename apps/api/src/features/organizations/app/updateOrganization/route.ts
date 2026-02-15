import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateOrganizationHandler } from "./handler.js";
import {
  UpdateOrganizationParamsSchema,
  UpdateOrganizationBodySchema,
  UpdateOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateOrganizationRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Update organization",
        description: "Update organization data (requires active membership)",
        params: UpdateOrganizationParamsSchema,
        body: UpdateOrganizationBodySchema,
        response: {
          200: UpdateOrganizationResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    updateOrganizationHandler
  );
};
