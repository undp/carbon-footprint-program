import { updateReductionProjectHandler } from "./handler.js";
import {
  UpdateReductionProjectParamsSchema,
  UpdateReductionProjectBodySchema,
  UpdateReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const updateReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Update a reduction project",
        description: "Update a draft reduction project",
        params: UpdateReductionProjectParamsSchema,
        body: UpdateReductionProjectBodySchema,
        response: {
          200: UpdateReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    updateReductionProjectHandler
  );
};
