import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  RestoreOrganizationMainActivityParamsSchema,
  RestoreOrganizationMainActivityResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { restoreOrganizationMainActivityHandler } from "./handler.js";

export const restoreOrganizationMainActivityRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/:id/restore",
    {
      schema: {
        tags: ["admin-organization-main-activities"],
        summary: "Restore a soft-deleted organization main activity",
        params: RestoreOrganizationMainActivityParamsSchema,
        response: {
          200: RestoreOrganizationMainActivityResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    restoreOrganizationMainActivityHandler
  );
};
