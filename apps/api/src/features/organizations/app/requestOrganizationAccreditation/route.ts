import type { FastifyZodInstance } from "@/types/fastify.js";
import { requestOrganizationAccreditationHandler } from "./handler.js";
import {
  RequestOrganizationAccreditationParamsSchema,
  RequestOrganizationAccreditationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const requestOrganizationAccreditationRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/:id/accredit",
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
    },
    requestOrganizationAccreditationHandler
  );
};
