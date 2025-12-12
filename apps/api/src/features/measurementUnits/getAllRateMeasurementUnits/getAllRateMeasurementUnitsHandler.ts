import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllRateMeasurementUnitsService } from "./getAllRateMeasurementUnitsService.js";

export const getAllRateMeasurementUnitsHandler = createGetAllHandler(
  "rateMeasurementUnits",
  getAllRateMeasurementUnitsService,
  "Rate measurement units"
);
