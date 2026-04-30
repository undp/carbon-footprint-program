import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  RestoreOrganizationMainActivityParams,
  RestoreOrganizationMainActivityResponse,
} from "@repo/types";
import { restoreOrganizationMainActivityService } from "./service.js";

export const restoreOrganizationMainActivityHandler = createActionHandler<
  RestoreOrganizationMainActivityParams,
  RestoreOrganizationMainActivityResponse
>(
  "admin-organization-main-activities",
  restoreOrganizationMainActivityService,
  "Organization main activity"
);
