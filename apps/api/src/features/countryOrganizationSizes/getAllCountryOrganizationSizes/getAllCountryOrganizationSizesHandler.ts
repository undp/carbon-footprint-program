import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCountryOrganizationSizesService } from "./getAllCountryOrganizationSizesService.js";
import type { GetAllCountryOrganizationSizesResponse } from "@repo/types";

export const getAllCountryOrganizationSizesHandler =
  createGetAllHandler<GetAllCountryOrganizationSizesResponse>(
    "countryOrganizationSizes",
    getAllCountryOrganizationSizesService,
    "Country organization sizes"
  );
