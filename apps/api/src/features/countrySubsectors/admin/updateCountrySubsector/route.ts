import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  UpdateCountrySubsectorParamsSchema,
  UpdateCountrySubsectorRequestSchema,
  UpdateCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateCountrySubsectorHandler } from "./handler.js";

export const updateCountrySubsectorRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["admin-country-subsectors"],
        summary: "Update a country subsector",
        params: UpdateCountrySubsectorParamsSchema,
        body: UpdateCountrySubsectorRequestSchema,
        response: {
          200: UpdateCountrySubsectorResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateCountrySubsectorHandler
  );
};
