import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllMeasurementUnitsService } from "./getAllMeasurementUnitsService.js";

export const getAllMeasurementUnitsHandler = createGetAllHandler(
  "measurementUnits",
  getAllMeasurementUnitsService,
  "Measurement units"
);
