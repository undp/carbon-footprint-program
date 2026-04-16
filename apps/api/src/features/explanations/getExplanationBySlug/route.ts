import { getExplanationBySlugHandler } from "./handler.js";
import {
  GetExplanationBySlugParamsSchema,
  GetExplanationBySlugResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "../../../routes/api/index.js";

export const getExplanationBySlugRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/:slug",
    {
      schema: {
        tags: ["explanations"],
        summary: "Get explanation by slug",
        description: "Get a specific explanation by its slug",
        params: GetExplanationBySlugParamsSchema,
        response: {
          200: GetExplanationBySlugResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getExplanationBySlugHandler
  );
};
