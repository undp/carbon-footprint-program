import { createPostHandler } from "@/handlerFactory/index.js";
import type {
  CreateCountrySectorRequest,
  CreateCountrySectorResponse,
} from "@repo/types";
import { createCountrySectorService } from "./service.js";

export const createCountrySectorHandler = createPostHandler<
  CreateCountrySectorRequest,
  CreateCountrySectorResponse
>("admin-country-sectors", createCountrySectorService, "Country sector");
