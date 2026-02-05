import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCountrySectorsService } from "./service.js";
import type { GetAllCountrySectorsResponse } from "@repo/types";

export const getAllCountrySectorsHandler =
  createGetAllHandler<GetAllCountrySectorsResponse>(
    "countrySectors",
    getAllCountrySectorsService,
    "Country sectors"
  );
