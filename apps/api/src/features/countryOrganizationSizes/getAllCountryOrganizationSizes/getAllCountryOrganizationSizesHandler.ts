import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCountryOrganizationSizesService } from "./getAllCountryOrganizationSizesService.js";

export const getAllCountryOrganizationSizesHandler = createGetAllHandler(
  "countryOrganizationSizes",
  getAllCountryOrganizationSizesService,
  "Country organization sizes"
);
