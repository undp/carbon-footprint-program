import type { FastifyZodInstance } from "@/types/fastify.js";
import { createMagnitudeHandler } from "./handler.js";
import {
  CreateMagnitudeBodySchema,
  CreateMagnitudeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createMagnitudeRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["magnitudes"],
        summary: "Create a new magnitude",
        description:
          "Creates a new custom magnitude. If the code matches a soft-deleted custom magnitude, it is restored.",
        body: CreateMagnitudeBodySchema,
        response: {
          201: CreateMagnitudeResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    createMagnitudeHandler
  );
};
