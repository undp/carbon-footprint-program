import { addReductionProjectReportHandler } from "./handler.js";
import {
  AddReductionProjectReportParamsSchema,
  AddReductionProjectReportBodySchema,
  AddReductionProjectReportResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const addReductionProjectReportRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/reports",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Add a reduction report to a project",
        description: "Adds a yearly reduction report to a DRAFT project",
        params: AddReductionProjectReportParamsSchema,
        body: AddReductionProjectReportBodySchema,
        response: {
          201: AddReductionProjectReportResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    addReductionProjectReportHandler
  );
};
