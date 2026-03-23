import { objectReductionProjectHandler } from "./handler.js";
import {
  ObjectReductionProjectParamsSchema,
  ObjectReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const objectReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/object",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Object a reduction project",
        description: "Transitions an IN_REVIEW project to OBJECTED",
        params: ObjectReductionProjectParamsSchema,
        response: {
          200: ObjectReductionProjectResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    objectReductionProjectHandler
  );
};
