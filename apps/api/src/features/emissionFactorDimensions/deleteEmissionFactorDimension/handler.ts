import { createDeleteHandler } from "@/handlerFactory/createDeleteHandler.js";
import { deleteEmissionFactorDimensionService } from "./service.js";
import type { DeleteEmissionFactorDimensionParams } from "@repo/types";

export const deleteEmissionFactorDimensionHandler =
  createDeleteHandler<DeleteEmissionFactorDimensionParams>(
    "emissionFactorDimensions",
    deleteEmissionFactorDimensionService,
    "EmissionFactorDimension"
  );
