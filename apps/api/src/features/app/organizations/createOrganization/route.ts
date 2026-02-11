import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  CreateOrganizationBodySchema,
  CreateOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createOrganizationHandler } from "./handler.js";

export const createOrganizationRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["app", "organizations"],
        summary: "Create a new organization",
        description:
          "Creates a new organization with NOT_ACCREDITED status and associated DRAFT data.",
        body: CreateOrganizationBodySchema,
        response: {
          201: CreateOrganizationResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    createOrganizationHandler
  );
};
