import { getExplanationByIdHandler } from "./handler.js";
import {
  GetExplanationByIdParamsSchema,
  GetExplanationByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "../../../routes/api/index.js";

export const getExplanationByIdRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["explanations"],
        summary: "Get explanation by ID",
        description: "Get a specific explanation by its ID",
        params: GetExplanationByIdParamsSchema,
        response: {
          200: GetExplanationByIdResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getExplanationByIdHandler
  );
};
