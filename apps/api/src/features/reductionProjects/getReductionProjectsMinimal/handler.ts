import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getReductionProjectsMinimalService } from "./service.js";
import type {
  GetReductionProjectsMinimalParams,
  GetReductionProjectsMinimalResponse,
} from "@repo/types";

export const getReductionProjectsMinimalHandler = createGetAllHandler<
  GetReductionProjectsMinimalResponse,
  GetReductionProjectsMinimalParams
>(
  "reductionProjectsMinimal",
  getReductionProjectsMinimalService,
  "Reduction projects minimal data",
  false
);
