import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  RestoreCountrySectorParams,
  RestoreCountrySectorResponse,
} from "@repo/types";
import { restoreCountrySectorService } from "./service.js";

export const restoreCountrySectorHandler = createActionHandler<
  RestoreCountrySectorParams,
  RestoreCountrySectorResponse
>("admin-country-sectors", restoreCountrySectorService, "Country sector");
