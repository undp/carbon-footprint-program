import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllMethodologiesHandler } from "./handler.js";
import { GetAllMethodologiesResponseSchema } from "@repo/types";

export const getAllMethodologiesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Get all methodologies",
        description:
          "Get all active methodologies with country info and counts of related categories and carbon inventories, ordered by creation date (newest first)",
        response: {
          200: GetAllMethodologiesResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllMethodologiesHandler
  );
};
