import { requestOrganizationAccreditationHandler } from "./handler.js";
import {
  RequestOrganizationAccreditationParamsSchema,
  RequestOrganizationAccreditationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const requestOrganizationAccreditationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/request-accreditation",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Request organization accreditation",
        description:
          "Submit organization for accreditation (requires active membership)",
        params: RequestOrganizationAccreditationParamsSchema,
        response: {
          200: RequestOrganizationAccreditationResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    requestOrganizationAccreditationHandler
  );
};
