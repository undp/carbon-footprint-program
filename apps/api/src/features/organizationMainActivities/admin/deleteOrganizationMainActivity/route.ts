import { z } from "zod";
import { defineRoute } from "@/routing/defineRoute.js";
import {
  DeleteOrganizationMainActivityParams,
  DeleteOrganizationMainActivityParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteOrganizationMainActivityHandler } from "./handler.js";

export const deleteOrganizationMainActivityRoute = defineRoute<{
  Params: DeleteOrganizationMainActivityParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["admin-organization-main-activities"],
    summary: "Soft-delete an organization main activity",
    params: DeleteOrganizationMainActivityParamsSchema,
    response: {
      200: z.null().describe("Successfully soft-deleted"),
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteOrganizationMainActivityHandler,
});
