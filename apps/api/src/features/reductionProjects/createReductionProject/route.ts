import { createReductionProjectHandler } from "./handler.js";
import {
  CreateReductionProjectRequestSchema,
  CreateReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { OrganizationRole } from "@repo/database/enums";
import { reductionProjectOrganizationIdExtractor } from "../helpers.js";
import type { CreateReductionProjectRequest } from "@repo/types";

export const createReductionProjectRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.post<{ Body: CreateReductionProjectRequest }>(
    "/",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Create a reduction project",
        description: "Creates an empty reduction project row",
        body: CreateReductionProjectRequestSchema,
        response: {
          201: CreateReductionProjectResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireOrganizationRole(
          reductionProjectOrganizationIdExtractor,
          {
            allowedRoles: [
              OrganizationRole.CONTRIBUTOR,
              OrganizationRole.ADMIN,
            ],
          }
        ),
      ],
    },
    createReductionProjectHandler
  );
};
