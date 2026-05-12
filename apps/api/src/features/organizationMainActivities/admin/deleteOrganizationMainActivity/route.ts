import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { DeleteOrganizationMainActivityParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteOrganizationMainActivityHandler } from "./handler.js";

export const deleteOrganizationMainActivityRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-organization-main-activities"],
        summary: "Soft-delete an organization main activity",
        params: DeleteOrganizationMainActivityParamsSchema,
        response: {
          200: z.null().describe("Successfully soft-deleted"),
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteOrganizationMainActivityHandler
  );
};
