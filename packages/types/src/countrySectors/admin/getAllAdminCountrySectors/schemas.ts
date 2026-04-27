import { z } from "zod";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const AdminListStatusFilterSchema = z
  .enum(["active", "deleted", "all"])
  .default("active")
  .describe("Filtro por estado para la lista de admin");

export const GetAllAdminCountrySectorsQuerySchema = z.object({
  status: AdminListStatusFilterSchema.optional(),
});

export const GetAllAdminCountrySectorsResponseSchema = z.array(
  AdminCountrySectorSchema
);
