import { createPatchHandler } from "@/handlerFactory/index.js";
import type {
  UpdateCountryOrganizationSizeParams,
  UpdateCountryOrganizationSizeRequest,
  UpdateCountryOrganizationSizeResponse,
} from "@repo/types";
import { updateCountryOrganizationSizeService } from "./service.js";

export const updateCountryOrganizationSizeHandler = createPatchHandler<
  UpdateCountryOrganizationSizeParams,
  UpdateCountryOrganizationSizeRequest,
  UpdateCountryOrganizationSizeResponse
>(
  "admin-country-organization-sizes",
  updateCountryOrganizationSizeService,
  "Country organization size"
);
