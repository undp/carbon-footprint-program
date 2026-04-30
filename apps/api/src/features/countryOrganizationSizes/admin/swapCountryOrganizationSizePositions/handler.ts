import { createPostHandler } from "@/handlerFactory/index.js";
import { swapCountryOrganizationSizePositionsService } from "./service.js";
import type {
  SwapCountryOrganizationSizePositionsRequest,
  SwapCountryOrganizationSizePositionsResponse,
} from "@repo/types";

export const swapCountryOrganizationSizePositionsHandler = createPostHandler<
  SwapCountryOrganizationSizePositionsRequest,
  SwapCountryOrganizationSizePositionsResponse
>(
  "country-organization-sizes",
  swapCountryOrganizationSizePositionsService,
  "OrganizationSizePositions"
);
