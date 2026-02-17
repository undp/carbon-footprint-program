import { z } from "zod";
import { DeleteFileResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteFileHandler } from "./handler.js";

const ParamsSchema = z.object({
  uuid: z.string().uuid().describe("The UUID of the file to delete"),
});

export const deleteFileRoute: StandardRouteSignature = (fastify, options) => {
  fastify.delete<{ Params: z.infer<typeof ParamsSchema> }>(
    "/:uuid",
    {
      schema: {
        tags: ["files"],
        summary: "Soft-delete a file",
        params: ParamsSchema,
        response: {
          200: DeleteFileResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    deleteFileHandler
  );
};
