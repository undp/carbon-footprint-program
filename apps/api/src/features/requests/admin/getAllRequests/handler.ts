import { createGetAllHandler } from "../../../../handlerFactory/createGetAllHandler.js";
import { getAllRequestsService } from "./service.js";

export const getAllRequestsHandler = createGetAllHandler(
  "admin-requests",
  getAllRequestsService,
  "requests",
  false
);
