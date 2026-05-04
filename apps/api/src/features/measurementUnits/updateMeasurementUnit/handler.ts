import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateMeasurementUnitService } from "./service.js";
import type {
  UpdateMeasurementUnitParams,
  UpdateMeasurementUnitBody,
  UpdateMeasurementUnitResponse,
} from "@repo/types";

export const updateMeasurementUnitHandler = createPatchHandler<
  UpdateMeasurementUnitParams,
  UpdateMeasurementUnitBody,
  UpdateMeasurementUnitResponse
>("measurementUnits", updateMeasurementUnitService, "MeasurementUnit");
