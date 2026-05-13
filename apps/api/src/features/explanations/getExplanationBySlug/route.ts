import { getExplanationBySlugHandler } from "./handler.js";
import {
  GetExplanationBySlugParams,
  GetExplanationBySlugParamsSchema,
  GetExplanationBySlugResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getExplanationBySlugRoute = defineRoute<{
  Params: GetExplanationBySlugParams;
}>({
  method: "GET",
  path: "/:slug",
  schema: {
    tags: ["explanations"],
    summary: "Get explanation by slug",
    description: "Get a specific explanation by its slug",
    params: GetExplanationBySlugParamsSchema,
    response: {
      200: GetExplanationBySlugResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getExplanationBySlugHandler,
});
