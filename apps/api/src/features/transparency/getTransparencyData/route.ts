import { getTransparencyDataHandler } from "./handler.js";
import {
  GetTransparencyDataQuerySchema,
  GetTransparencyDataResponseSchema,
} from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getTransparencyDataRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getTransparencyDataHandler
  );
};
