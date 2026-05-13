import { createCarbonInventoryHandler } from "./handler.js";
import {
  CreateCarbonInventoryRequest,
  CreateCarbonInventoryRequestSchema,
  CreateCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const createCarbonInventoryRoute = defineRoute<{
  Body: CreateCarbonInventoryRequest;
}>({
  method: "POST",
  path: "/",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Create a new carbon inventory",
    description: "Create a new carbon inventory with the provided data",
    body: CreateCarbonInventoryRequestSchema,
    response: {
      201: CreateCarbonInventoryResponseSchema,
      400: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: createCarbonInventoryHandler,
});
