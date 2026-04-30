import { createGetAllHandler } from "@/handlerFactory/index.js";
import type {
  GetAllAdminCountrySubsectorsQuery,
  GetAllAdminCountrySubsectorsResponse,
} from "@repo/types";
import { getAllAdminCountrySubsectorsService } from "./service.js";

export const getAllAdminCountrySubsectorsHandler = createGetAllHandler<
  GetAllAdminCountrySubsectorsResponse,
  GetAllAdminCountrySubsectorsQuery
>(
  "admin-country-subsectors",
  getAllAdminCountrySubsectorsService,
  "Country subsectors",
  false
);
