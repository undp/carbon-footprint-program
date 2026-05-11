import { createDeleteHandler } from "@/handlerFactory/index.js";
import { deleteMagnitudeService } from "./service.js";
import type { DeleteMagnitudeParams } from "@repo/types";

export const deleteMagnitudeHandler =
  createDeleteHandler<DeleteMagnitudeParams>(
    "magnitudes",
    deleteMagnitudeService,
    "Magnitude"
  );
