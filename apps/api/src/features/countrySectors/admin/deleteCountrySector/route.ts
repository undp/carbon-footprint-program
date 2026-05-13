import { z } from "zod";
import { defineRoute } from "@/routing/defineRoute.js";
import {
  DeleteCountrySectorParams,
  DeleteCountrySectorParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountrySectorHandler } from "./handler.js";

export const deleteCountrySectorRoute = defineRoute<{
  Params: DeleteCountrySectorParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["admin-country-sectors"],
    summary: "Soft-delete a country sector",
    description:
      "Transitions the row to status=DELETED. Blocked when ACTIVE catalog references (subsectors, main activities, subcategory recommendations) point at it.",
    params: DeleteCountrySectorParamsSchema,
    response: {
      200: z.null().describe("Successfully soft-deleted"),
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteCountrySectorHandler,
});
