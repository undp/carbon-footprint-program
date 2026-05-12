import { getSystemParametersHandler } from "./handler.js";
import {
  GetSystemParametersQuerySchema,
  GetSystemParametersResponseSchema,
} from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getSystemParametersRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["system-parameters"],
        summary: "Get system parameters",
        description:
          "Get system parameters, optionally filtered by comma-separated keys",
        querystring: GetSystemParametersQuerySchema,
        response: {
          200: GetSystemParametersResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getSystemParametersHandler
  );
};
