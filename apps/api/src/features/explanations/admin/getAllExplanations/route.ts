import { GetAllExplanationsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllExplanationsHandler } from "./handler.js";

export const getAllExplanationsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-explanations"],
        summary: "List explanations",
        description:
          "Returns the explanation catalog rows for admin maintenance, sorted by name ascending.",
        response: {
          200: GetAllExplanationsResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllExplanationsHandler
  );
};
