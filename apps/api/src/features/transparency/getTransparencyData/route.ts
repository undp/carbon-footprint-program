import type { FastifyZodInstance } from "@/types/fastify.js";
import { getTransparencyDataHandler } from "./handler.js";
import {
  GetTransparencyDataQuerySchema,
  GetTransparencyDataResponseSchema,
} from "@repo/types";

export const getTransparencyDataRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      config: { public: true },
      schema: {
        tags: ["transparency"],
        summary: "Get transparency data",
        description:
          "Get all accredited organizations with their recognition seals. This is a public endpoint.",
        querystring: GetTransparencyDataQuerySchema,
        response: {
          200: GetTransparencyDataResponseSchema,
        },
      },
    },
    getTransparencyDataHandler
  );
};
