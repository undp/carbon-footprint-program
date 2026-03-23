import { getAllSealApplicationsHandler } from "./handler.js";
import {
  GetAllSealApplicationsQuerySchema,
  GetAllSealApplicationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllSealApplicationsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/seal-applications",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Get all seal applications",
        description:
          "Get all reduction project seal applications for an organization",
        querystring: GetAllSealApplicationsQuerySchema,
        response: {
          200: GetAllSealApplicationsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getAllSealApplicationsHandler
  );
};
