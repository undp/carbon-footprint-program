import { getSubmissionWarningsHandler } from "./handler.js";
import {
  GetSubmissionWarningsParams,
  GetSubmissionWarningsParamsSchema,
  GetSubmissionWarningsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getSubmissionWarningsRoute = defineRoute<{
  Params: GetSubmissionWarningsParams;
}>({
  method: "GET",
  path: "/:id/warnings",
  schema: {
    tags: ["admin-submissions"],
    summary: "Get submission warnings",
    description:
      "Compute the list of warnings for a submission, dispatched by submission type. " +
      "For organization accreditations, returns identity-collision warnings against other organizations.",
    params: GetSubmissionWarningsParamsSchema,
    response: {
      200: GetSubmissionWarningsResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  // ADMIN/SUPERADMIN enforced via the admin submissions router's defaultSystemRoles.
  access: { mode: "private" },
  handler: getSubmissionWarningsHandler,
});
