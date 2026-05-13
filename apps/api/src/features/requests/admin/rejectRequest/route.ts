import { rejectRequestHandler } from "./handler.js";
import {
  RejectRequestBody,
  RejectRequestBodySchema,
  RejectRequestParams,
  RejectRequestParamsSchema,
  RejectRequestResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const rejectRequestRoute = defineRoute<{
  Params: RejectRequestParams;
  Body: RejectRequestBody;
}>({
  method: "POST",
  path: "/:id/reject",
  schema: {
    tags: ["admin-requests"],
    summary: "Reject a request",
    description: "Reject a pending submission request",
    params: RejectRequestParamsSchema,
    body: RejectRequestBodySchema,
    response: {
      200: RejectRequestResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: rejectRequestHandler,
});
