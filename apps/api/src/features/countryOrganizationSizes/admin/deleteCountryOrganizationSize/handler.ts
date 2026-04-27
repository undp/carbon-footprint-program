import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  DeleteCountryOrganizationSizeParams,
  DeleteCountryOrganizationSizeResponse,
} from "@repo/types";
import { deleteCountryOrganizationSizeService } from "./service.js";

export const deleteCountryOrganizationSizeHandler = createActionHandler<
  DeleteCountryOrganizationSizeParams,
  DeleteCountryOrganizationSizeResponse
>(
  "admin-country-organization-sizes",
  deleteCountryOrganizationSizeService,
  "Country organization size"
);
