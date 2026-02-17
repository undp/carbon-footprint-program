import { z } from "zod";
import {
  IdSchema,
  FileTypeSchema,
  GetFilesQuerySchema,
  GetFilesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { getFilesHandler } from "./handler.js";

const ParamsSchema = z.object({
  fileType: FileTypeSchema.describe(
    "The type of files to list"
  ),
  ownerId: IdSchema.describe("The ID of the owning entity"),
});

export const getFilesRoute: StandardRouteSignature = (fastify, options) => {
  fastify.get<{
    Params: z.infer<typeof ParamsSchema>;
    Querystring: z.infer<typeof GetFilesQuerySchema>;
  }>(
    "/:fileType/:ownerId",
    {
      schema: {
        tags: ["files"],
        summary: "List files by type and owner",
        params: ParamsSchema,
        querystring: GetFilesQuerySchema,
        response: {
          200: GetFilesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getFilesHandler
  );
};
