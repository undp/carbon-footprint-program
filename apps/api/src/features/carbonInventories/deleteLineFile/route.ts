import {
  DeleteLineFileParamsSchema,
  DeleteLineFileResponseSchema,
  type DeleteLineFileParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { deleteLineFileHandler } from "./handler.js";

export const deleteLineFileRoute = defineRoute<{
  Params: DeleteLineFileParams;
}>({
  method: "DELETE",
  path: "/:id/files/:uuid",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Soft-delete a carbon inventory line file",
    params: DeleteLineFileParamsSchema,
    response: {
      200: DeleteLineFileResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: {
      requiredOrganizationRoles: [
        OrganizationRole.CONTRIBUTOR,
        OrganizationRole.ADMIN,
      ],
    },
  },
  handler: deleteLineFileHandler,
});
