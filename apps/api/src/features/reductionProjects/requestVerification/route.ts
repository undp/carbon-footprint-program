import { requestReductionProjectVerificationHandler } from "./handler.js";
import {
  RequestReductionProjectVerificationBody,
  RequestReductionProjectVerificationBodySchema,
  RequestReductionProjectVerificationParams,
  RequestReductionProjectVerificationParamsSchema,
  RequestReductionProjectVerificationResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const requestReductionProjectVerificationRoute = defineRoute<{
  Params: RequestReductionProjectVerificationParams;
  Body: RequestReductionProjectVerificationBody;
}>({
  method: "POST",
  path: "/:id/request-verification",
  schema: {
    tags: ["reduction-projects"],
    summary: "Request verification submission for a reduction project",
    description:
      "Creates a new REDUCTION_PROJECT_VERIFICATION submission for the specified reduction project and links the uploaded files",
    params: RequestReductionProjectVerificationParamsSchema,
    body: RequestReductionProjectVerificationBodySchema,
    response: {
      200: RequestReductionProjectVerificationResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "reductionProject",
      options: {
        requiredOrganizationRoles: [
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.ADMIN,
        ],
      },
    },
  },
  handler: requestReductionProjectVerificationHandler,
});
