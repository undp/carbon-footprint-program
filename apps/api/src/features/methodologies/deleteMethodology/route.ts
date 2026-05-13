import { defineRoute } from "@/routing/defineRoute.js";
import { deleteMethodologyHandler } from "./handler.js";
import {
  DeleteMethodologyParams,
  DeleteMethodologyParamsSchema,
  DeleteMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteMethodologyRoute = defineRoute<{
  Params: DeleteMethodologyParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["methodologies"],
    summary: "Delete a methodology",
    description: "Soft delete a methodology by setting its status to DELETED",
    params: DeleteMethodologyParamsSchema,
    response: {
      200: DeleteMethodologyResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteMethodologyHandler,
});
