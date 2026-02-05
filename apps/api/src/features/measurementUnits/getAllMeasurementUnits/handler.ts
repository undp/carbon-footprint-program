import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllMeasurementUnitsService } from "./service.js";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";

export const getAllMeasurementUnitsHandler =
  createGetAllHandler<GetAllMeasurementUnitsResponse>(
    "measurementUnits",
    getAllMeasurementUnitsService,
    "Measurement units"
  );
