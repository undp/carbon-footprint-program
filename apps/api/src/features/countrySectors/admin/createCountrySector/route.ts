import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  CreateCountrySectorRequestSchema,
  CreateCountrySectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountrySectorHandler } from "./handler.js";

export const createCountrySectorRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["admin-country-sectors"],
        summary: "Create a country sector",
        description:
          "Creates a new country sector. Country is resolved automatically (singleton).",
        body: CreateCountrySectorRequestSchema,
        response: {
          201: CreateCountrySectorResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    createCountrySectorHandler
  );
};
