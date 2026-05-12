import { blockOrganizationHandler } from "./handler.js";
import {
  BlockOrganizationParamsSchema,
  BlockOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const blockOrganizationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    blockOrganizationHandler
  );
};
