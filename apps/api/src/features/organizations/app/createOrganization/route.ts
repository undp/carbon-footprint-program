import type { FastifyZodInstance } from "@/types/fastify.js";
import { createOrganizationHandler } from "./handler.js";
import {
  CreateOrganizationBodySchema,
  CreateOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createOrganizationRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Create organization",
        description: "Create a new organization with auto-membership as ADMIN",
        body: CreateOrganizationBodySchema,
        response: {
          201: CreateOrganizationResponseSchema,
          400: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    createOrganizationHandler
  );
};
