import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllMeasurementUnitsService } from "./getAllMeasurementUnitsService.js";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";

export const getAllMeasurementUnitsHandler =
  createGetAllHandler<GetAllMeasurementUnitsResponse>(
    "measurementUnits",
    getAllMeasurementUnitsService,
    "Measurement units"
  );
