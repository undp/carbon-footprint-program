import { defineRoute } from "@/routing/defineRoute.js";
import {
  CreateCountrySectorRequest,
  CreateCountrySectorRequestSchema,
  CreateCountrySectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountrySectorHandler } from "./handler.js";

export const createCountrySectorRoute = defineRoute<{
  Body: CreateCountrySectorRequest;
}>({
  method: "POST",
  path: "/",
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
  access: { mode: "private" },
  handler: createCountrySectorHandler,
});
