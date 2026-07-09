import { approveRequestHandler } from "./handler.js";
import {
  ApproveRequestBody,
  ApproveRequestBodySchema,
  ApproveRequestParams,
  ApproveRequestParamsSchema,
  ApproveRequestResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const approveRequestRoute = defineRoute<{
  Params: ApproveRequestParams;
  Body: ApproveRequestBody;
}>({
  method: "POST",
  path: "/:id/approve",
  schema: {
    tags: ["admin-requests"],
    summary: "Approve a request",
    description: "Approve a pending submission request",
    params: ApproveRequestParamsSchema,
    body: ApproveRequestBodySchema,
    response: {
      200: ApproveRequestResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: approveRequestHandler,
});
