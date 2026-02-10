import type { FastifyZodInstance } from "@/types/fastify.js";
import { toggleOrganizationBlockedHandler } from "./handler.js";
import {
  ToggleOrganizationBlockedParamsSchema,
  ToggleOrganizationBlockedResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const toggleOrganizationBlockedRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id/blocked",
    {
      schema: {
        tags: ["admin", "organizations"],
        summary: "Toggle organization blocked status",
        description:
          "Block or unblock an organization. When blocking, sets status to BLOCKED. When unblocking, determines the appropriate status based on accreditation data.",
        params: ToggleOrganizationBlockedParamsSchema,
        response: {
          200: ToggleOrganizationBlockedResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    toggleOrganizationBlockedHandler
  );
};
