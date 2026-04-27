import { createActionHandler } from "@/handlerFactory/index.js";
import type {
  DeleteCountrySectorParams,
  DeleteCountrySectorResponse,
} from "@repo/types";
import { deleteCountrySectorService } from "./service.js";

// We use the action-handler pattern (returns 200 with the updated body) instead of the
// standard delete handler (returns 204 with no body), because soft-delete is semantically
// an "action" that mutates the row to status=DELETED and returns the resulting row.
export const deleteCountrySectorHandler = createActionHandler<
  DeleteCountrySectorParams,
  DeleteCountrySectorResponse
>("admin-country-sectors", deleteCountrySectorService, "Country sector");
