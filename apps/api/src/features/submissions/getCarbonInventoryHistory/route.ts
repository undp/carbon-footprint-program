import { getCarbonInventoryHistoryHandler } from "./handler.js";
import {
  GetCarbonInventoryHistoryParamsSchema,
  GetSubmissionHistoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getCarbonInventoryHistoryRoute: StandardRouteSignature = (
  fastify
) => {
  fastify.get(
    "/carbon-inventory/:id/history",
    {
      schema: {
        tags: ["submissions"],
        summary: "Get carbon inventory submission history",
        description:
          "Get the history of submissions for a specific carbon inventory.",
        params: GetCarbonInventoryHistoryParamsSchema,
        response: {
          200: GetSubmissionHistoryResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    getCarbonInventoryHistoryHandler
  );
};
