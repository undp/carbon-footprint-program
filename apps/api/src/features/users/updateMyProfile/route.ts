import { defineRoute } from "@/routing/defineRoute.js";
import { updateMyProfileHandler } from "./handler.js";
import {
  UpdateMyProfileBody,
  UpdateMyProfileBodySchema,
  UpdateMyProfileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMyProfileRoute = defineRoute<{
  Body: UpdateMyProfileBody;
}>({
  method: "PATCH",
  path: "/me",
  schema: {
    tags: ["users"],
    summary: "Update the current user's profile",
    description: "Update profile fields of the currently authenticated user",
    body: UpdateMyProfileBodySchema,
    response: {
      200: UpdateMyProfileResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateMyProfileHandler,
});
