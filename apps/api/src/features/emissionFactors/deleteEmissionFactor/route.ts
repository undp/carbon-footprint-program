import { defineRoute } from "@/routing/defineRoute.js";
import { deleteEmissionFactorHandler } from "./handler.js";
import {
  DeleteEmissionFactorParams,
  DeleteEmissionFactorParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

export const deleteEmissionFactorRoute = defineRoute<{
  Params: DeleteEmissionFactorParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["emission-factors"],
    summary: "Delete an emission factor",
    description: "Soft-delete an emission factor by its ID",
    params: DeleteEmissionFactorParamsSchema,
    response: {
      200: z.null().describe("Successfully soft-deleted"),
      404: ApiErrorResponseSchema,
      // The service refuses to delete a factor a live line depends on, exactly
      // as the update route does. Undeclared, the generated contract says this
      // endpoint never returns 409 while the other one does, for one rule.
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteEmissionFactorHandler,
});
