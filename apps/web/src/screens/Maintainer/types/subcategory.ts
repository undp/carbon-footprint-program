import { GetAllSubcategoriesResponse } from "@repo/types";

export type MeasurementUnit =
  GetAllSubcategoriesResponse[number]["measurementUnits"][number];

export type Subcategory = GetAllSubcategoriesResponse[number];
