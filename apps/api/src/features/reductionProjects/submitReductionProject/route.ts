import { submitReductionProjectHandler } from "./handler.js";
import {
  SubmitReductionProjectParamsSchema,
  SubmitReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const submitReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/submit",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Submit a reduction project for seal review",
        description:
          "Transitions a DRAFT project to IN_REVIEW by creating a submission",
        params: SubmitReductionProjectParamsSchema,
        response: {
          200: SubmitReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    submitReductionProjectHandler
  );
};
