import { approveReductionProjectHandler } from "./handler.js";
import {
  ApproveReductionProjectParamsSchema,
  ApproveReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const approveReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/approve",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Approve a reduction project",
        description:
          "Transitions an IN_REVIEW project to APPROVED",
        params: ApproveReductionProjectParamsSchema,
        response: {
          200: ApproveReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    approveReductionProjectHandler
  );
};
