import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllRateMeasurementUnitsService } from "./service.js";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";

export const getAllRateMeasurementUnitsHandler =
  createGetAllHandler<GetAllRateMeasurementUnitsResponse>(
    "rateMeasurementUnits",
    getAllRateMeasurementUnitsService,
    "Rate measurement units"
  );
