import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  DeleteCountrySubsectorParams,
  DeleteCountrySubsectorResponse,
} from "@repo/types";
import { deleteCountrySubsectorService } from "./service.js";

export const deleteCountrySubsectorHandler = createActionHandler<
  DeleteCountrySubsectorParams,
  DeleteCountrySubsectorResponse
>(
  "admin-country-subsectors",
  deleteCountrySubsectorService,
  "Country subsector"
);
