import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateMagnitudeHandler } from "./handler.js";
import {
  UpdateMagnitudeParamsSchema,
  UpdateMagnitudeBodySchema,
  UpdateMagnitudeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMagnitudeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["magnitudes"],
        summary: "Update a magnitude",
        description:
          "Renames a magnitude. Only the name field is editable; code and isSystem are immutable.",
        params: UpdateMagnitudeParamsSchema,
        body: UpdateMagnitudeBodySchema,
        response: {
          200: UpdateMagnitudeResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateMagnitudeHandler
  );
};
