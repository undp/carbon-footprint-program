import { getReductionProjectByIdHandler } from "./handler.js";
import {
  GetReductionProjectByIdParams,
  GetReductionProjectByIdParamsSchema,
  GetReductionProjectByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getReductionProjectByIdRoute = defineRoute<{
  Params: GetReductionProjectByIdParams;
}>({
  method: "GET",
  path: "/:id",
  schema: {
    tags: ["reduction-projects"],
    summary: "Get reduction project by ID",
    params: GetReductionProjectByIdParamsSchema,
    response: {
      200: GetReductionProjectByIdResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "reductionProject",
      options: { canAdminsBypass: true },
    },
  },
  handler: getReductionProjectByIdHandler,
});
