import { z } from "zod";
import { defineRoute } from "@/routing/defineRoute.js";
import {
  DeleteCountrySubsectorParams,
  DeleteCountrySubsectorParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountrySubsectorHandler } from "./handler.js";

export const deleteCountrySubsectorRoute = defineRoute<{
  Params: DeleteCountrySubsectorParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["admin-country-subsectors"],
    summary: "Soft-delete a country subsector",
    description:
      "Transitions the row to status=DELETED and cascade soft-deletes its ACTIVE catalog children (main activities, subcategory recommendations). Organization-owned data is left untouched.",
    params: DeleteCountrySubsectorParamsSchema,
    response: {
      200: z.null().describe("Successfully soft-deleted"),
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteCountrySubsectorHandler,
});
