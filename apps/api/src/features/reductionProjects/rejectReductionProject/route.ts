import { rejectReductionProjectHandler } from "./handler.js";
import {
  RejectReductionProjectParamsSchema,
  RejectReductionProjectBodySchema,
  RejectReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const rejectReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/reject",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Reject a reduction project",
        description:
          "Transitions an IN_REVIEW project to REJECTED with reviewer comments",
        params: RejectReductionProjectParamsSchema,
        body: RejectReductionProjectBodySchema,
        response: {
          200: RejectReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    rejectReductionProjectHandler
  );
};
