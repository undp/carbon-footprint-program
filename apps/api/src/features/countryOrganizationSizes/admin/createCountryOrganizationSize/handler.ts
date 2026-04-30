import { createPostHandler } from "@/handlerFactory/index.js";
import type {
  CreateCountryOrganizationSizeRequest,
  CreateCountryOrganizationSizeResponse,
} from "@repo/types";
import { createCountryOrganizationSizeService } from "./service.js";

export const createCountryOrganizationSizeHandler = createPostHandler<
  CreateCountryOrganizationSizeRequest,
  CreateCountryOrganizationSizeResponse
>(
  "admin-country-organization-sizes",
  createCountryOrganizationSizeService,
  "Country organization size"
);
