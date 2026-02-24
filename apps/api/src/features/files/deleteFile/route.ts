import { z } from "zod";
import { DeleteFileResponseSchema, DeleteFileParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteFileHandler } from "./handler.js";

export const deleteFileRoute: StandardRouteSignature = (fastify) => {
  fastify.delete<{ Params: z.infer<typeof DeleteFileParamsSchema> }>(
    "/:uuid",
    {
      schema: {
        tags: ["files"],
        summary: "Soft-delete a file",
        params: DeleteFileParamsSchema,
        response: {
          200: DeleteFileResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteFileHandler
  );
};
