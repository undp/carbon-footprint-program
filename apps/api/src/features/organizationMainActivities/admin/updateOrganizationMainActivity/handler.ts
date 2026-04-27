import { createPatchHandler } from "@/handlerFactory/index.js";
import type {
  UpdateOrganizationMainActivityParams,
  UpdateOrganizationMainActivityRequest,
  UpdateOrganizationMainActivityResponse,
} from "@repo/types";
import { updateOrganizationMainActivityService } from "./service.js";

export const updateOrganizationMainActivityHandler = createPatchHandler<
  UpdateOrganizationMainActivityParams,
  UpdateOrganizationMainActivityRequest,
  UpdateOrganizationMainActivityResponse
>(
  "admin-organization-main-activities",
  updateOrganizationMainActivityService,
  "Organization main activity"
);
