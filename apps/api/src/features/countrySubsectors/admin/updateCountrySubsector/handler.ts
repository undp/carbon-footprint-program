import { createPatchHandler } from "@/handlerFactory/index.js";
import type {
  UpdateCountrySubsectorParams,
  UpdateCountrySubsectorRequest,
  UpdateCountrySubsectorResponse,
} from "@repo/types";
import { updateCountrySubsectorService } from "./service.js";

export const updateCountrySubsectorHandler = createPatchHandler<
  UpdateCountrySubsectorParams,
  UpdateCountrySubsectorRequest,
  UpdateCountrySubsectorResponse
>(
  "admin-country-subsectors",
  updateCountrySubsectorService,
  "Country subsector"
);
