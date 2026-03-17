import { selfDeclareHandler } from "./handler.js";
import {
  SelfDeclareParamsSchema,
  SelfDeclareResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const selfDeclareRoute: StandardRouteSignature = (fastify) => {
  fastify.post(
    "/:id/self-declare",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Self-declare a carbon inventory",
        description:
          "Marks a carbon inventory as self-declared and optionally creates an auto-approved submission based on system parameters",
        params: SelfDeclareParamsSchema,
        response: {
          200: SelfDeclareResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    selfDeclareHandler
  );
};
