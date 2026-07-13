import { defineRoute } from "@/routing/defineRoute.js";
import { completeOnboardingHandler } from "./handler.js";
import {
  CompleteOnboardingParams,
  CompleteOnboardingParamsSchema,
  CompleteOnboardingResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const completeOnboardingRoute = defineRoute<{
  Params: CompleteOnboardingParams;
}>({
  method: "POST",
  path: "/me/onboardings/:key/complete",
  schema: {
    tags: ["users"],
    summary: "Mark an onboarding as completed for the current user",
    description:
      "Idempotently records that the current user finished or dismissed the given onboarding, so it is not shown again",
    params: CompleteOnboardingParamsSchema,
    response: {
      204: CompleteOnboardingResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: completeOnboardingHandler,
});
