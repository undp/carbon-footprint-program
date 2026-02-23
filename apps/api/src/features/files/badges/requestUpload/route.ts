import { z } from "zod";
import {
  BadgeTypeSchema,
  BadgeRequestUploadBodySchema,
  BadgeRequestUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeRequestUploadHandler } from "./handler.js";

const ParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const badgeRequestUploadRoute = (fastify: FastifyZodInstance) => {
  fastify.post<{
    Params: z.infer<typeof ParamsSchema>;
    Body: z.infer<typeof BadgeRequestUploadBodySchema>;
  }>(
    "/:badgeType/request-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Request a temporary upload URL for a badge",
        params: ParamsSchema,
        body: BadgeRequestUploadBodySchema,
        response: {
          200: BadgeRequestUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    badgeRequestUploadHandler
  );
};
