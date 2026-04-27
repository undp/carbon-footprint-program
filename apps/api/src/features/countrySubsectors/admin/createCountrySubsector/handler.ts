import { createPostHandler } from "@/handlerFactory/index.js";
import type {
  CreateCountrySubsectorRequest,
  CreateCountrySubsectorResponse,
} from "@repo/types";
import { createCountrySubsectorService } from "./service.js";

export const createCountrySubsectorHandler = createPostHandler<
  CreateCountrySubsectorRequest,
  CreateCountrySubsectorResponse
>(
  "admin-country-subsectors",
  createCountrySubsectorService,
  "Country subsector"
);
