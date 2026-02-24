import { z } from "zod";
import {
  GetBadgeFilesParamsSchema,
  GetBadgeFilesQuerySchema,
  GetBadgeFilesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeGetFilesHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const badgeGetFilesRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance
) => {
  fastify.get<{
    Params: z.infer<typeof GetBadgeFilesParamsSchema>;
    Querystring: z.infer<typeof GetBadgeFilesQuerySchema>;
  }>(
    "/:badgeType",
    {
      schema: {
        tags: ["files"],
        summary: "List badge files by type",
        params: GetBadgeFilesParamsSchema,
        querystring: GetBadgeFilesQuerySchema,
        response: {
          200: GetBadgeFilesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    badgeGetFilesHandler
  );
};
