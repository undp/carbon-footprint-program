import { defineRoute } from "@/routing/defineRoute.js";
import { duplicateMethodologyHandler } from "./handler.js";
import {
  DuplicateMethodologyParams,
  DuplicateMethodologyParamsSchema,
  DuplicateMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const duplicateMethodologyRoute = defineRoute<{
  Params: DuplicateMethodologyParams;
}>({
  method: "POST",
  path: "/:id/duplicate",
  schema: {
    tags: ["methodologies"],
    summary: "Duplicate a methodology",
    description: "Create a copy of an existing methodology",
    params: DuplicateMethodologyParamsSchema,
    response: {
      201: DuplicateMethodologyResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: duplicateMethodologyHandler,
});
