import { updateReductionProjectHandler } from "./handler.js";
import {
  UpdateReductionProjectParamsSchema,
  UpdateReductionProjectRequestSchema,
  UpdateReductionProjectResponseSchema,
  type UpdateReductionProjectParams,
  type UpdateReductionProjectRequest,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { OrganizationRole } from "@repo/database/enums";
import { reductionProjectOrganizationIdExtractor } from "../helpers.js";

export const updateReductionProjectRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.patch<{
    Params: UpdateReductionProjectParams;
    Body: UpdateReductionProjectRequest;
  }>(
    "/:id",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Update a reduction project",
        params: UpdateReductionProjectParamsSchema,
        body: UpdateReductionProjectRequestSchema,
        response: {
          200: UpdateReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireOrganizationRole(
          reductionProjectOrganizationIdExtractor,
          {
            allowedRoles: [
              OrganizationRole.CONTRIBUTOR,
              OrganizationRole.ADMIN,
            ],
          }
        ),
      ],
    },
    updateReductionProjectHandler
  );
};
