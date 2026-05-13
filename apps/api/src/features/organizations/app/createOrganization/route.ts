import { createOrganizationHandler } from "./handler.js";
import {
  CreateOrganizationBody,
  CreateOrganizationBodySchema,
  CreateOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const createOrganizationRoute = defineRoute<{
  Body: CreateOrganizationBody;
}>({
  method: "POST",
  path: "/",
  schema: {
    tags: ["organizations"],
    summary: "Create organization",
    description:
      "Create a new organization with auto-membership as ACCREDITED_MEMBER",
    body: CreateOrganizationBodySchema,
    response: {
      201: CreateOrganizationResponseSchema,
      400: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: createOrganizationHandler,
});
