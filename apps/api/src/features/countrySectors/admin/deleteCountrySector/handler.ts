import { createDeleteHandler } from "@/handlerFactory/index.js";
import type { DeleteCountrySectorParams } from "@repo/types";
import { deleteCountrySectorService } from "./service.js";

export const deleteCountrySectorHandler =
  createDeleteHandler<DeleteCountrySectorParams>(
    "admin-country-sectors",
    deleteCountrySectorService,
    "Country sector"
  );
