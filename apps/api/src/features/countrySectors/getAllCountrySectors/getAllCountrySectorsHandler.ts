import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCountrySectorsService } from "./getAllCountrySectorsService.js";

export const getAllCountrySectorsHandler = createGetAllHandler(
  "countrySectors",
  getAllCountrySectorsService,
  "Country sectors"
);
