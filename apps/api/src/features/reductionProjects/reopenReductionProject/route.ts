import { reopenReductionProjectHandler } from "./handler.js";
import {
  ReopenReductionProjectParamsSchema,
  ReopenReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const reopenReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/reopen",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Reopen a rejected reduction project",
        description:
          "Transitions a REJECTED project back to DRAFT for corrections",
        params: ReopenReductionProjectParamsSchema,
        response: {
          200: ReopenReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    reopenReductionProjectHandler
  );
};
