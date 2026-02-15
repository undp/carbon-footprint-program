import type { FastifyZodInstance } from "@/types/fastify.js";
import { unblockOrganizationHandler } from "./handler.js";
import {
  UnblockOrganizationParamsSchema,
  UnblockOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const unblockOrganizationRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/:id/unblock",
    {
      schema: {
        tags: ["admin-organizations"],
        summary: "Unblock an organization",
        description: "Unblock an organization by setting its status to ACTIVE",
        params: UnblockOrganizationParamsSchema,
        response: {
          200: UnblockOrganizationResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    unblockOrganizationHandler
  );
};
