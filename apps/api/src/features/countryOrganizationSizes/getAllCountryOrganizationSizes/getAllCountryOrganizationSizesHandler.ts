import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCountryOrganizationSizesService } from "./getAllCountryOrganizationSizesService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting all country organization sizes.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getAllCountryOrganizationSizesHandler = createGetAllHandler(
  "countryOrganizationSizes",
  getAllCountryOrganizationSizesService,
  "Country organization sizes"
);
