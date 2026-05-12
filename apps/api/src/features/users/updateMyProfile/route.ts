import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateMyProfileHandler } from "./handler.js";
import {
  UpdateMyProfileBody,
  UpdateMyProfileBodySchema,
  UpdateMyProfileResponse,
  UpdateMyProfileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMyProfileRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Body: UpdateMyProfileBody;
    Reply: UpdateMyProfileResponse;
  }>(
    "/me",
    {
      schema: {
        tags: ["users"],
        summary: "Update the current user's profile",
        description:
          "Update profile fields of the currently authenticated user",
        body: UpdateMyProfileBodySchema,
        response: {
          200: UpdateMyProfileResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateMyProfileHandler
  );
};
