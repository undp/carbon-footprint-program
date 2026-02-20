import { updateOrganizationHandler } from "./handler.js";
import {
  UpdateOrganizationParamsSchema,
  UpdateOrganizationBodySchema,
  UpdateOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const updateOrganizationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Update organization",
        description:
          "Update organization data (requires active membership). Behavior varies by state: DRAFT updates in-place, APPROVED creates new submission, PENDING throws error, REJECTED creates new draft.",
        params: UpdateOrganizationParamsSchema,
        body: UpdateOrganizationBodySchema,
        response: {
          200: UpdateOrganizationResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    updateOrganizationHandler
  );
};
