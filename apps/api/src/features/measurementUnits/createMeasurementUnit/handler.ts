import { createPostHandler } from "@/handlerFactory/index.js";
import { createMeasurementUnitService } from "./service.js";
import type {
  CreateMeasurementUnitBody,
  CreateMeasurementUnitResponse,
} from "@repo/types";

export const createMeasurementUnitHandler = createPostHandler<
  CreateMeasurementUnitBody,
  CreateMeasurementUnitResponse
>("measurementUnits", createMeasurementUnitService, "MeasurementUnit");
