import type {
  GetAllSealApplicationsResponse,
  GetAllSealApplicationsQuery,
} from "@repo/types";
import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllSealApplicationsService } from "./service.js";

export const getAllSealApplicationsHandler = createGetAllHandler<
  GetAllSealApplicationsResponse,
  GetAllSealApplicationsQuery
>(
  "reductionProjects",
  getAllSealApplicationsService,
  "Seal applications",
  false
);
