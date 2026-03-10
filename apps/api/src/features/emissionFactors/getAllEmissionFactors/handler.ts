import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllEmissionFactorsService } from "./service.js";
import type {
  GetAllEmissionFactorsQuery,
  GetAllEmissionFactorsResponse,
} from "@repo/types";

export const getAllEmissionFactorsHandler = createGetAllHandler<
  GetAllEmissionFactorsResponse,
  GetAllEmissionFactorsQuery
>("emissionFactors", getAllEmissionFactorsService, "EmissionFactor", false);
