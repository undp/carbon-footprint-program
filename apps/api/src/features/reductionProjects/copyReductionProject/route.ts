import { copyReductionProjectHandler } from "./handler.js";
import {
  CopyReductionProjectParamsSchema,
  CopyReductionProjectResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const copyReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/copy",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Copy a reduction project",
        description:
          "Creates a new DRAFT reduction project as a copy of an APPROVED one",
        params: CopyReductionProjectParamsSchema,
        response: {
          200: CopyReductionProjectResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    copyReductionProjectHandler
  );
};
