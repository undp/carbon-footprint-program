import { createDeleteHandler } from "@/handlerFactory/index.js";
import type { DeleteOrganizationMainActivityParams } from "@repo/types";
import { deleteOrganizationMainActivityService } from "./service.js";

export const deleteOrganizationMainActivityHandler =
  createDeleteHandler<DeleteOrganizationMainActivityParams>(
    "admin-organization-main-activities",
    deleteOrganizationMainActivityService,
    "Organization main activity"
  );
