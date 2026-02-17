import { z } from "zod";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { downloadFileHandler } from "./handler.js";

const ParamsSchema = z.object({
  uuid: z.string().uuid().describe("The UUID of the file to download"),
});

export const downloadFileRoute: StandardRouteSignature = (fastify, options) => {
  fastify.get<{ Params: z.infer<typeof ParamsSchema> }>(
    "/:uuid/download",
    {
      schema: {
        tags: ["files"],
        summary: "Download a file",
        params: ParamsSchema,
        response: {
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    downloadFileHandler
  );
};
