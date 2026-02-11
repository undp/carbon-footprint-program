import type { FastifyZodInstance } from "@/types/fastify.js";
import { submitAccreditationRequestHandler } from "./handler.js";
import {
  SubmitAccreditationRequestParamsSchema,
  SubmitAccreditationRequestResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const submitAccreditationRequestRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/:id/accredited",
    {
      schema: {
        tags: ["app", "organizations"],
        summary: "Submit organization data for accreditation",
        description:
          "Transitions organization data from DRAFT to SUBMITTED and creates a pending submission.",
        params: SubmitAccreditationRequestParamsSchema,
        response: {
          201: SubmitAccreditationRequestResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    submitAccreditationRequestHandler
  );
};
