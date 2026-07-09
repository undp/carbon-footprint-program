import { defineRoute } from "@/routing/defineRoute.js";
import { getAllMeasurementUnitsHandler } from "./handler.js";
import { GetAllMeasurementUnitsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllMeasurementUnitsRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["measurement-units"],
    summary: "Get all measurement units",
    description: "Retrieves all measurement units with their details",
    response: {
      200: GetAllMeasurementUnitsResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getAllMeasurementUnitsHandler,
});
