import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  CreateCountrySubsectorRequestSchema,
  CreateCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountrySubsectorHandler } from "./handler.js";

export const createCountrySubsectorRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["admin-country-subsectors"],
        summary: "Create a country subsector",
        body: CreateCountrySubsectorRequestSchema,
        response: {
          201: CreateCountrySubsectorResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createCountrySubsectorHandler
  );
};
