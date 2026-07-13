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
      "Creates a new PENDING REDUCTION_PROJECT_VERIFICATION submission. Serves both the DRAFT first submit and the REVIEWED re-submit.",
    params: RequestReductionProjectVerificationParamsSchema,
    body: RequestReductionProjectVerificationBodySchema,
    response: {
      200: RequestReductionProjectVerificationResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
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
