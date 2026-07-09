import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllMagnitudesService } from "./service.js";
import type { GetAllMagnitudesResponse } from "@repo/types";

export const getAllMagnitudesHandler =
  createGetAllHandler<GetAllMagnitudesResponse>(
    "magnitudes",
    getAllMagnitudesService,
    "Magnitudes",
    false
  );
