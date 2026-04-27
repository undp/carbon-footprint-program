import { createGetAllHandler } from "@/handlerFactory/index.js";
import type {
  GetAllAdminCountrySectorsQuery,
  GetAllAdminCountrySectorsResponse,
} from "@repo/types";
import { getAllAdminCountrySectorsService } from "./service.js";

export const getAllAdminCountrySectorsHandler = createGetAllHandler<
  GetAllAdminCountrySectorsResponse,
  GetAllAdminCountrySectorsQuery
>(
  "admin-country-sectors",
  getAllAdminCountrySectorsService,
  "Country sectors",
  // Empty list is valid in admin context (admin may have soft-deleted everything).
  false
);
