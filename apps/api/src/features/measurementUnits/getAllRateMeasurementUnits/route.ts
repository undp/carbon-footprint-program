import { defineRoute } from "@/routing/defineRoute.js";
import { getAllRateMeasurementUnitsHandler } from "./handler.js";
import { GetAllRateMeasurementUnitsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllRateMeasurementUnitsRoute = defineRoute({
  method: "GET",
  path: "/rates",
  schema: {
    tags: ["measurement-units"],
    summary: "Get all rate measurement units",
    description:
      "Retrieves all ACTIVE rate measurement units with their numerator and denominator units",
    response: {
      200: GetAllRateMeasurementUnitsResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getAllRateMeasurementUnitsHandler,
});
