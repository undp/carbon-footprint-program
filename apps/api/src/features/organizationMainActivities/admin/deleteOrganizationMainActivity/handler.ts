import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  DeleteOrganizationMainActivityParams,
  DeleteOrganizationMainActivityResponse,
} from "@repo/types";
import { deleteOrganizationMainActivityService } from "./service.js";

export const deleteOrganizationMainActivityHandler = createActionHandler<
  DeleteOrganizationMainActivityParams,
  DeleteOrganizationMainActivityResponse
>(
  "admin-organization-main-activities",
  deleteOrganizationMainActivityService,
  "Organization main activity"
);
