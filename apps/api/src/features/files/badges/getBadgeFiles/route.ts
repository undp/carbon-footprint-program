import { z } from "zod";
import {
  BadgeTypeSchema,
  BadgeGetFilesQuerySchema,
  BadgeGetFilesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeGetFilesHandler } from "./handler.js";

const ParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const badgeGetFilesRoute = (fastify: FastifyZodInstance) => {
  fastify.get<{
    Params: z.infer<typeof ParamsSchema>;
    Querystring: z.infer<typeof BadgeGetFilesQuerySchema>;
  }>(
    "/:badgeType",
    {
      schema: {
        tags: ["files"],
        summary: "List badge files by type",
        params: ParamsSchema,
        querystring: BadgeGetFilesQuerySchema,
        response: {
          200: BadgeGetFilesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    badgeGetFilesHandler
  );
};
