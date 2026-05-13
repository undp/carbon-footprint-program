import { defineRoute } from "@/routing/defineRoute.js";
import { createEmissionFactorHandler } from "./handler.js";
import {
  CreateEmissionFactorRequest,
  CreateEmissionFactorRequestSchema,
  CreateEmissionFactorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createEmissionFactorRoute = defineRoute<{
  Body: CreateEmissionFactorRequest;
}>({
  method: "POST",
  path: "/",
  schema: {
    tags: ["emission-factors"],
    summary: "Create an emission factor",
    description: "Create a new emission factor within a subcategory",
    body: CreateEmissionFactorRequestSchema,
    response: {
      201: CreateEmissionFactorResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: createEmissionFactorHandler,
});
