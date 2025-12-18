import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllRateMeasurementUnitsService } from "./getAllRateMeasurementUnitsService.js";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";

export const getAllRateMeasurementUnitsHandler =
  createGetAllHandler<GetAllRateMeasurementUnitsResponse>(
    "rateMeasurementUnits",
    getAllRateMeasurementUnitsService,
    "Rate measurement units"
  );
