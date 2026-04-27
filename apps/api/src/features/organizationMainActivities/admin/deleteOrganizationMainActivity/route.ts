import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  DeleteOrganizationMainActivityParamsSchema,
  DeleteOrganizationMainActivityResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteOrganizationMainActivityHandler } from "./handler.js";

export const deleteOrganizationMainActivityRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-organization-main-activities"],
        summary: "Soft-delete an organization main activity",
        params: DeleteOrganizationMainActivityParamsSchema,
        response: {
          200: DeleteOrganizationMainActivityResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteOrganizationMainActivityHandler
  );
};
