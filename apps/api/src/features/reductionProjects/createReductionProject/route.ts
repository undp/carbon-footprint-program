import { createReductionProjectHandler } from "./handler.js";
import {
  CreateReductionProjectBodySchema,
  CreateReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const createReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Create a new reduction project",
        description: "Create a new reduction project draft",
        body: CreateReductionProjectBodySchema,
        response: {
          201: CreateReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    createReductionProjectHandler
  );
};
