import { createPatchHandler } from "@/handlerFactory/index.js";
import type {
  UpdateCountrySectorParams,
  UpdateCountrySectorRequest,
  UpdateCountrySectorResponse,
} from "@repo/types";
import { updateCountrySectorService } from "./service.js";

export const updateCountrySectorHandler = createPatchHandler<
  UpdateCountrySectorParams,
  UpdateCountrySectorRequest,
  UpdateCountrySectorResponse
>("admin-country-sectors", updateCountrySectorService, "Country sector");
