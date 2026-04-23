import { createGetAllHandler } from "@/handlerFactory/createGetAllHandler.js";
import { getAllInitiativesService } from "./service.js";

export const getAllInitiativesHandler = createGetAllHandler(
  "admin-reduction-plan-initiatives",
  (prisma, _query, _user) => getAllInitiativesService(prisma),
  "reduction plan initiatives",
  false
);
