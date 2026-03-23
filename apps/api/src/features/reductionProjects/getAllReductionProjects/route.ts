import { getAllReductionProjectsHandler } from "./handler.js";
import {
  GetAllReductionProjectsQuerySchema,
  GetAllReductionProjectsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllReductionProjectsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Get all reduction projects",
        description:
          "Get all reduction projects for an organization with optional filters",
        querystring: GetAllReductionProjectsQuerySchema,
        response: {
          200: GetAllReductionProjectsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getAllReductionProjectsHandler
  );
};
