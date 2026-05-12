import { unblockOrganizationHandler } from "./handler.js";
import {
  UnblockOrganizationParamsSchema,
  UnblockOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const unblockOrganizationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    unblockOrganizationHandler
  );
};
