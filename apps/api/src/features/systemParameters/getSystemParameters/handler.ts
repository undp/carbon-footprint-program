import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getSystemParametersService } from "./service.js";
import type {
  GetSystemParametersQuery,
  GetSystemParametersResponse,
} from "@repo/types";

export const getSystemParametersHandler = createGetAllHandler<
  GetSystemParametersResponse,
  GetSystemParametersQuery
>("systemParameters", getSystemParametersService, "System parameters", false);
