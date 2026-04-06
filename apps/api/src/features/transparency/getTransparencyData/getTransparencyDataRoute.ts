import { z } from "zod";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { getTransparencyDataHandler } from "./getTransparencyDataHandler.js";
import { GetTransparencyDataResponseSchema } from "@repo/types";

export const getTransparencyDataRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      config: { public: true },
      schema: {
        tags: ["transparency"],
        summary: "Get transparency data",
        description:
          "Get all companies with their recognition seals. This is a public endpoint.",
        querystring: z.object({
          year: z
            .string()
            .regex(/^\d{4}$/)
            .optional()
            .describe("Filter by year"),
        }),
        response: {
          200: GetTransparencyDataResponseSchema,
        },
      },
    },
    getTransparencyDataHandler
  );
};
