import { createGetAllHandler } from "@/handlerFactory/index.js";
import type {
  GetAllAdminOrganizationMainActivitiesQuery,
  GetAllAdminOrganizationMainActivitiesResponse,
} from "@repo/types";
import { getAllAdminOrganizationMainActivitiesService } from "./service.js";

export const getAllAdminOrganizationMainActivitiesHandler = createGetAllHandler<
  GetAllAdminOrganizationMainActivitiesResponse,
  GetAllAdminOrganizationMainActivitiesQuery
>(
  "admin-organization-main-activities",
  getAllAdminOrganizationMainActivitiesService,
  "Organization main activities",
  false
);
