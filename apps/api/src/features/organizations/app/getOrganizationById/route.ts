import { getOrganizationByIdHandler } from "./handler.js";
import {
  GetOrganizationByIdParamsSchema,
  GetOrganizationByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getOrganizationByIdRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Get organization by ID",
        description:
          "Get organization details by ID (requires active membership)",
        params: GetOrganizationByIdParamsSchema,
        response: {
          200: GetOrganizationByIdResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getOrganizationByIdHandler
  );
};
