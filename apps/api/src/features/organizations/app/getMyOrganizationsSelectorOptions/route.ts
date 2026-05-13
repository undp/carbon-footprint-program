import { getMyOrganizationsHandler } from "./handler.js";
import { GetMyOrganizationsSelectorOptionsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getMyOrganizationsRoute = defineRoute({
  method: "GET",
  path: "/me",
  schema: {
    tags: ["organizations"],
    summary: "Get my organizations",
    description:
      "Get all organizations where the user has an active membership",
    response: {
      200: GetMyOrganizationsSelectorOptionsResponseSchema,
      401: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getMyOrganizationsHandler,
});
