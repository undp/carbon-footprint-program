import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getEmissionFactorDimensionsService } from "./service.js";
import type {
  GetEmissionFactorDimensionsQuery,
  GetEmissionFactorDimensionsResponse,
} from "@repo/types";

export const getEmissionFactorDimensionsHandler = createGetAllHandler<
  GetEmissionFactorDimensionsResponse,
  GetEmissionFactorDimensionsQuery
>(
  "emissionFactorDimensions",
  getEmissionFactorDimensionsService,
  "EmissionFactorDimension",
  false
);
