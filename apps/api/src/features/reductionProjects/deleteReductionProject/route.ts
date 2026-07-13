import { deleteReductionProjectHandler } from "./handler.js";
import {
  DeleteReductionProjectParams,
  DeleteReductionProjectParamsSchema,
  DeleteReductionProjectResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const deleteReductionProjectRoute = defineRoute<{
  Params: DeleteReductionProjectParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["reduction-projects"],
    summary: "Delete a reduction project draft",
    description:
      "Soft-delete a DRAFT reduction project by ID (sets status to DELETED). Only drafts are deletable.",
    params: DeleteReductionProjectParamsSchema,
    response: {
      200: DeleteReductionProjectResponseSchema,
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
  handler: deleteReductionProjectHandler,
});
