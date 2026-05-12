import { reviewSubmissionHandler } from "./handler.js";
import {
  ReviewSubmissionBodySchema,
  ReviewSubmissionParamsSchema,
  ReviewSubmissionResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

//TODO: Move this route to submissions routes and folder
export const reviewSubmissionRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/review",
    {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    reviewSubmissionHandler
  );
};
