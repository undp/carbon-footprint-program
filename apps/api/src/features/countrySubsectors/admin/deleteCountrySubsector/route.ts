import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { DeleteCountrySubsectorParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountrySubsectorHandler } from "./handler.js";

export const deleteCountrySubsectorRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-country-subsectors"],
        summary: "Soft-delete a country subsector",
        description:
          "Transitions the row to status=DELETED. Blocked when ACTIVE catalog references (main activities, subcategory recommendations) point at it.",
        params: DeleteCountrySubsectorParamsSchema,
        response: {
          200: z.null().describe("Successfully soft-deleted"),
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteCountrySubsectorHandler
  );
};
