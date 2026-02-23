import { z } from "zod";
import {
  BadgeTypeSchema,
  BadgeConfirmUploadBodySchema,
  BadgeConfirmUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeConfirmUploadHandler } from "./handler.js";

const ParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const badgeConfirmUploadRoute = (fastify: FastifyZodInstance) => {
  fastify.post<{
    Params: z.infer<typeof ParamsSchema>;
    Body: z.infer<typeof BadgeConfirmUploadBodySchema>;
  }>(
    "/:badgeType/confirm-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Confirm a badge file upload and create the database record",
        params: ParamsSchema,
        body: BadgeConfirmUploadBodySchema,
        response: {
          201: BadgeConfirmUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    badgeConfirmUploadHandler
  );
};
