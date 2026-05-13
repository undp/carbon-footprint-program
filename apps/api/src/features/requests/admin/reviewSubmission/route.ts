import { reviewSubmissionHandler } from "./handler.js";
import {
  ReviewSubmissionBody,
  ReviewSubmissionBodySchema,
  ReviewSubmissionParams,
  ReviewSubmissionParamsSchema,
  ReviewSubmissionResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

//TODO: Move this route to submissions routes and folder
export const reviewSubmissionRoute = defineRoute<{
  Params: ReviewSubmissionParams;
  Body: ReviewSubmissionBody;
}>({
  method: "POST",
  path: "/:id/review",
  schema: {
    tags: ["admin-requests"],
    summary: "Review submission",
    description: "Review a pending submission",
    params: ReviewSubmissionParamsSchema,
    body: ReviewSubmissionBodySchema,
    response: {
      200: ReviewSubmissionResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: reviewSubmissionHandler,
});
