import { createGetAllHandler } from "@/handlerFactory/createGetAllHandler.js";
import { getMyOrganizationsSelectorOptionsService } from "./service.js";

export const getMyOrganizationsHandler = createGetAllHandler(
  "app-organizations",
  getMyOrganizationsSelectorOptionsService,
  "User organizations",
  false
);
