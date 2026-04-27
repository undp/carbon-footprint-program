import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  GetAllAdminCountrySectorsQuerySchema,
  GetAllAdminCountrySectorsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminCountrySectorsHandler } from "./handler.js";

export const getAllAdminCountrySectorsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-country-sectors"],
        summary: "Get all country sectors (admin view)",
        description:
          "Returns all country sectors with admin fields (status, description, audit fields, isInUse). Filter via ?status=active|deleted|all (default active).",
        querystring: GetAllAdminCountrySectorsQuerySchema,
        response: {
          200: GetAllAdminCountrySectorsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    getAllAdminCountrySectorsHandler
  );
};
