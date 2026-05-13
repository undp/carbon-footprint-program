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
    },
  },
  access: { mode: "private" },
  handler: deleteEmissionFactorHandler,
});
