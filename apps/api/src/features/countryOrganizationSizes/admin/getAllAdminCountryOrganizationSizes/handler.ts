import { createGetAllHandler } from "@/handlerFactory/index.js";
import type {
  GetAllAdminCountryOrganizationSizesQuery,
  GetAllAdminCountryOrganizationSizesResponse,
} from "@repo/types";
import { getAllAdminCountryOrganizationSizesService } from "./service.js";

export const getAllAdminCountryOrganizationSizesHandler = createGetAllHandler<
  GetAllAdminCountryOrganizationSizesResponse,
  GetAllAdminCountryOrganizationSizesQuery
>(
  "admin-country-organization-sizes",
  getAllAdminCountryOrganizationSizesService,
  "Country organization sizes",
  false
);
