import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  RestoreCountrySubsectorParams,
  RestoreCountrySubsectorResponse,
} from "@repo/types";
import { restoreCountrySubsectorService } from "./service.js";

export const restoreCountrySubsectorHandler = createActionHandler<
  RestoreCountrySubsectorParams,
  RestoreCountrySubsectorResponse
>(
  "admin-country-subsectors",
  restoreCountrySubsectorService,
  "Country subsector"
);
