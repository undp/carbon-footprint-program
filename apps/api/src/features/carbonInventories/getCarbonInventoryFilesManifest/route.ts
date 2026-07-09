import {
  GetCarbonInventoryFilesManifestParamsSchema,
  GetCarbonInventoryFilesManifestResponseSchema,
  type GetCarbonInventoryFilesManifestParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { getCarbonInventoryFilesManifestHandler } from "./handler.js";

export const getCarbonInventoryFilesManifestRoute = defineRoute<{
  Params: GetCarbonInventoryFilesManifestParams;
}>({
  method: "GET",
  path: "/:id/files-manifest",
  schema: {
    tags: ["carbon-inventories"],
    summary: "List signed SAS URLs for every active line file",
    description:
      "Returns one entry per active-line active-file attachment, each signed with a single user-delegation-key SAS so the browser can bulk-download them directly from Azure for ZIP assembly.",
    params: GetCarbonInventoryFilesManifestParamsSchema,
    response: {
      200: GetCarbonInventoryFilesManifestResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryFilesManifestHandler,
});
