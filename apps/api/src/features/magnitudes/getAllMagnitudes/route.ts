import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllMagnitudesHandler } from "./handler.js";
import { GetAllMagnitudesResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllMagnitudesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["magnitudes"],
        summary: "List all active magnitudes",
        description:
          "Returns active magnitudes pinned by isSystem and ordered by name, each with its reference count.",
        response: {
          200: GetAllMagnitudesResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllMagnitudesHandler
  );
};
