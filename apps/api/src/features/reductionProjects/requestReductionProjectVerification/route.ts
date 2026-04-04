import { requestReductionProjectVerificationHandler } from "./handler.js";
import {
  RequestReductionProjectVerificationParamsSchema,
  RequestReductionProjectVerificationBodySchema,
  RequestReductionProjectVerificationResponseSchema,
  type RequestReductionProjectVerificationParams,
  type RequestReductionProjectVerificationBody,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractReductionProjectIdFromParams } from "../reductionProjectIdExtractors.js";

export const requestReductionProjectVerificationRoute: StandardRouteSignature =
  (fastify) => {
    fastify.post<{
      Params: RequestReductionProjectVerificationParams;
      Body: RequestReductionProjectVerificationBody;
    }>(
      "/:id/request-verification",
      {
        schema: {
          tags: ["reduction-projects"],
          summary: "Request reduction project verification",
          description:
            "Creates a verification submission for this reduction project (first request or after rejection).",
          params: RequestReductionProjectVerificationParamsSchema,
          body: RequestReductionProjectVerificationBodySchema,
          response: {
            200: RequestReductionProjectVerificationResponseSchema,
            403: ApiErrorResponseSchema,
            404: ApiErrorResponseSchema,
            422: ApiErrorResponseSchema,
            503: ApiErrorResponseSchema,
          },
        },
        preHandler: [
          fastify.requireReductionProjectAccess(
            extractReductionProjectIdFromParams,
            {
              requiredOrganizationRoles: [
                OrganizationRole.CONTRIBUTOR,
                OrganizationRole.ADMIN,
              ],
            }
          ),
        ],
      },
      requestReductionProjectVerificationHandler
    );
  };
