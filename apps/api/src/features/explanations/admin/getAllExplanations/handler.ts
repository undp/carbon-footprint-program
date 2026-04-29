import { createGetAllHandler } from "@/handlerFactory/index.js";
import type { GetAllExplanationsResponse } from "@repo/types";
import { getAllExplanationsService } from "./service.js";

export const getAllExplanationsHandler =
  createGetAllHandler<GetAllExplanationsResponse>(
    "admin-explanations",
    getAllExplanationsService,
    "Explanations",
    false
  );
