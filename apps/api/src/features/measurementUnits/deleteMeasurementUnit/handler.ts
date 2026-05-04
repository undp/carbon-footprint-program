import { createDeleteHandler } from "@/handlerFactory/index.js";
import { deleteMeasurementUnitService } from "./service.js";
import type { DeleteMeasurementUnitParams } from "@repo/types";

export const deleteMeasurementUnitHandler =
  createDeleteHandler<DeleteMeasurementUnitParams>(
    "measurementUnits",
    deleteMeasurementUnitService,
    "MeasurementUnit"
  );
