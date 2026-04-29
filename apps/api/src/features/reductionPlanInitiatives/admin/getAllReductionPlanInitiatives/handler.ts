import { createGetAllHandler } from "@/handlerFactory/createGetAllHandler.js";
import type {
  GetAllReductionPlanInitiativesQuery,
  GetAllReductionPlanInitiativesResponse,
} from "@repo/types";
import { getAllReductionPlanInitiativesService } from "./service.js";

export const getAllReductionPlanInitiativesHandler = createGetAllHandler<
  GetAllReductionPlanInitiativesResponse,
  GetAllReductionPlanInitiativesQuery
>(
  "admin-reduction-plan-initiatives",
  (prisma, query, _user) =>
    getAllReductionPlanInitiativesService(prisma, query),
  "reduction plan initiatives",
  false
);
