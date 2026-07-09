import { defineRoute } from "@/routing/defineRoute.js";
import { updateMethodologyHandler } from "./handler.js";
import {
  UpdateMethodologyParams,
  UpdateMethodologyParamsSchema,
  UpdateMethodologyRequest,
  UpdateMethodologyRequestSchema,
  UpdateMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMethodologyRoute = defineRoute<{
  Params: UpdateMethodologyParams;
  Body: UpdateMethodologyRequest;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["methodologies"],
    summary: "Update a methodology",
    description: "Update an existing methodology by its ID",
    params: UpdateMethodologyParamsSchema,
    body: UpdateMethodologyRequestSchema,
    response: {
      200: UpdateMethodologyResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateMethodologyHandler,
});
