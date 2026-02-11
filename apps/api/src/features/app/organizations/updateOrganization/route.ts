import { FastifyZodInstance } from "@/types/fastify.js";
import {
  UpdateOrganizationParamsSchema,
  UpdateOrganizationRequestSchema,
  UpdateOrganizationResponseSchema,
} from "@repo/types";
import { updateOrganizationHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "../../../../commonSchemas/errors.js";

export const updateOrganizationRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Update an organization",
        description:
          "Updates organization data with complex business logic based on accreditation status.",
        params: UpdateOrganizationParamsSchema,
        body: UpdateOrganizationRequestSchema,
        response: {
          200: UpdateOrganizationResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    updateOrganizationHandler
  );
};
