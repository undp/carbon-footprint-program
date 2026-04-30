import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  CreateCountrySubsectorRequestSchema,
  CreateCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountrySubsectorHandler } from "./handler.js";

export const createCountrySubsectorRoute = (fastify: FastifyZodInstance) => {
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
    },
    createCountrySubsectorHandler
  );
};
