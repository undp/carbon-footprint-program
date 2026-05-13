import { defineRoute } from "@/routing/defineRoute.js";
import { createMethodologyHandler } from "./handler.js";
import {
  CreateMethodologyRequest,
  CreateMethodologyRequestSchema,
  CreateMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createMethodologyRoute = defineRoute<{
  Body: CreateMethodologyRequest;
}>({
  method: "POST",
  path: "/",
  schema: {
    tags: ["methodologies"],
    summary: "Create a new methodology",
    description: "Create a new methodology version for a country",
    body: CreateMethodologyRequestSchema,
    response: {
      201: CreateMethodologyResponseSchema,
      400: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: createMethodologyHandler,
});
