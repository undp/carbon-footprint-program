import { getTransparencyDataHandler } from "./handler.js";
import {
  GetTransparencyDataQuerySchema,
  GetTransparencyDataResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";

export const getTransparencyDataRoute = defineRoute<{
  Querystring: { year?: string };
}>({
  method: "GET",
  path: "/",
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
  access: { mode: "public" },
  handler: getTransparencyDataHandler,
});
