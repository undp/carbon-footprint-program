import { createReductionProjectHandler } from "./handler.js";
import {
  CreateReductionProjectRequest,
  CreateReductionProjectRequestSchema,
  CreateReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { OrganizationRole } from "@repo/database/enums";
import { reductionProjectOrganizationIdExtractor } from "../helpers.js";

export const createReductionProjectRoute = defineRoute<{
  Body: CreateReductionProjectRequest;
}>({
  method: "POST",
  path: "/",
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
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      options: {
        extractor: reductionProjectOrganizationIdExtractor,
        requiredOrganizationRoles: [
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.ADMIN,
        ],
      },
    },
  },
  handler: createReductionProjectHandler,
});
