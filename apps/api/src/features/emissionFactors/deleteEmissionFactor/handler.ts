import { createDeleteHandler } from "@/handlerFactory/createDeleteHandler.js";
import { deleteEmissionFactorService } from "./service.js";
import type { DeleteEmissionFactorParams } from "@repo/types";

export const deleteEmissionFactorHandler =
  createDeleteHandler<DeleteEmissionFactorParams>(
    "emissionFactors",
    deleteEmissionFactorService,
    "EmissionFactor"
  );
