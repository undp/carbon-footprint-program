import {
  DeleteFileParams,
  DeleteFileParamsSchema,
  DeleteFileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { deleteFileHandler } from "./handler.js";

export const deleteFileRoute = defineRoute<{
  Params: DeleteFileParams;
}>({
  method: "DELETE",
  path: "/:uuid",
  schema: {
    tags: ["files"],
    summary: "Soft-delete a file",
    params: DeleteFileParamsSchema,
    response: {
      200: DeleteFileResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteFileHandler,
});
