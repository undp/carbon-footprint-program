import { deleteReductionProjectHandler } from "./handler.js";
import {
  DeleteReductionProjectParamsSchema,
  DeleteReductionProjectResponseSchema,
  type DeleteReductionProjectParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractReductionProjectIdFromParams } from "../reductionProjectIdExtractors.js";

export const deleteReductionProjectRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.delete<{ Params: DeleteReductionProjectParams }>(
    "/:id",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Delete a reduction project",
        description: "Soft-deletes the project (sets status to DELETED).",
        params: DeleteReductionProjectParamsSchema,
        response: {
          200: DeleteReductionProjectResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
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
    deleteReductionProjectHandler
  );
};
