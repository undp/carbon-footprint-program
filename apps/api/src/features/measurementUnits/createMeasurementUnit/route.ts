import type { FastifyZodInstance } from "@/types/fastify.js";
import { createMeasurementUnitHandler } from "./handler.js";
import {
  CreateMeasurementUnitBodySchema,
  CreateMeasurementUnitResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createMeasurementUnitRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["measurement-units"],
        summary: "Create a new measurement unit",
        description:
          "Creates a new measurement unit and its canonical rate unit. If the abbreviation matches a soft-deleted unit, it is restored.",
        body: CreateMeasurementUnitBodySchema,
        response: {
          201: CreateMeasurementUnitResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    createMeasurementUnitHandler
  );
};
