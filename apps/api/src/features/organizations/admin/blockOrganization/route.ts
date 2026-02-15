import type { FastifyZodInstance } from "@/types/fastify.js";
import { blockOrganizationHandler } from "./handler.js";
import {
  BlockOrganizationParamsSchema,
  BlockOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const blockOrganizationRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/:id/block",
    {
      schema: {
        tags: ["admin-organizations"],
        summary: "Block an organization",
        description: "Block an organization by setting its status to BLOCKED",
        params: BlockOrganizationParamsSchema,
        response: {
          200: BlockOrganizationResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    blockOrganizationHandler
  );
};
