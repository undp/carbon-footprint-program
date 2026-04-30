import { createDeleteHandler } from "@/handlerFactory/index.js";
import type { DeleteCountrySubsectorParams } from "@repo/types";
import { deleteCountrySubsectorService } from "./service.js";

export const deleteCountrySubsectorHandler =
  createDeleteHandler<DeleteCountrySubsectorParams>(
    "admin-country-subsectors",
    deleteCountrySubsectorService,
    "Country subsector"
  );
