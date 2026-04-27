import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  RestoreCountryOrganizationSizeParams,
  RestoreCountryOrganizationSizeResponse,
} from "@repo/types";
import { restoreCountryOrganizationSizeService } from "./service.js";

export const restoreCountryOrganizationSizeHandler = createActionHandler<
  RestoreCountryOrganizationSizeParams,
  RestoreCountryOrganizationSizeResponse
>(
  "admin-country-organization-sizes",
  restoreCountryOrganizationSizeService,
  "Country organization size"
);
