import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  CreateOrganizationMainActivityRequestSchema,
  CreateOrganizationMainActivityResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createOrganizationMainActivityHandler } from "./handler.js";

export const createOrganizationMainActivityRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["admin-organization-main-activities"],
        summary: "Create an organization main activity",
        body: CreateOrganizationMainActivityRequestSchema,
        response: {
          201: CreateOrganizationMainActivityResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    createOrganizationMainActivityHandler
  );
};
