import { createReductionProjectHandler } from "./handler.js";
import {
  CreateReductionProjectRequestSchema,
  CreateReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const createReductionProjectRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Create a reduction project",
        description: "Creates an empty reduction project row",
        body: CreateReductionProjectRequestSchema,
        response: {
          201: CreateReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    createReductionProjectHandler
  );
};
