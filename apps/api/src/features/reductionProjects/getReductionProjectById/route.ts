import { getReductionProjectByIdHandler } from "./handler.js";
import {
  GetReductionProjectByIdParamsSchema,
  GetReductionProjectByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getReductionProjectByIdRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Get a reduction project by ID",
        description:
          "Get a single reduction project with its files by ID",
        params: GetReductionProjectByIdParamsSchema,
        response: {
          200: GetReductionProjectByIdResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getReductionProjectByIdHandler
  );
};
