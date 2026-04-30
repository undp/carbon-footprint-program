import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  UpdateOrganizationMainActivityParamsSchema,
  UpdateOrganizationMainActivityRequestSchema,
  UpdateOrganizationMainActivityResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateOrganizationMainActivityHandler } from "./handler.js";

export const updateOrganizationMainActivityRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["admin-organization-main-activities"],
        summary: "Update an organization main activity",
        params: UpdateOrganizationMainActivityParamsSchema,
        body: UpdateOrganizationMainActivityRequestSchema,
        response: {
          200: UpdateOrganizationMainActivityResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    updateOrganizationMainActivityHandler
  );
};
