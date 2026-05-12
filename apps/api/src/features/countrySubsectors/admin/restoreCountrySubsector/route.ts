import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  RestoreCountrySubsectorParamsSchema,
  RestoreCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { restoreCountrySubsectorHandler } from "./handler.js";

export const restoreCountrySubsectorRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/restore",
    {
      schema: {
        tags: ["admin-country-subsectors"],
        summary: "Restore a soft-deleted country subsector",
        params: RestoreCountrySubsectorParamsSchema,
        response: {
          200: RestoreCountrySubsectorResponseSchema,
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
    restoreCountrySubsectorHandler
  );
};
