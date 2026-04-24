import { createGetAllHandler } from "@/handlerFactory/createGetAllHandler.js";
import { getAllReductionPlanInitiativesService } from "./service.js";

export const getAllReductionPlanInitiativesHandler = createGetAllHandler(
  "admin-reduction-plan-initiatives",
  (prisma, _query, _user) => getAllReductionPlanInitiativesService(prisma),
  "reduction plan initiatives",
  false
);
