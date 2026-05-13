import { updateReductionProjectHandler } from "./handler.js";
import {
  UpdateReductionProjectParams,
  UpdateReductionProjectParamsSchema,
  UpdateReductionProjectRequest,
  UpdateReductionProjectRequestSchema,
  UpdateReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { OrganizationRole } from "@repo/database/enums";
import { reductionProjectOrganizationIdExtractor } from "../helpers.js";

export const updateReductionProjectRoute = defineRoute<{
  Params: UpdateReductionProjectParams;
  Body: UpdateReductionProjectRequest;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["reduction-projects"],
    summary: "Update a reduction project",
    params: UpdateReductionProjectParamsSchema,
    body: UpdateReductionProjectRequestSchema,
    response: {
      200: UpdateReductionProjectResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      organization: {
        extractor: reductionProjectOrganizationIdExtractor,
        allowedRoles: [OrganizationRole.CONTRIBUTOR, OrganizationRole.ADMIN],
      },
    },
  },
  handler: updateReductionProjectHandler,
});
