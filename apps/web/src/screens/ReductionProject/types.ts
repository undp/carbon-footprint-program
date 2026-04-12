import type { ConsideredGei, GwpSource } from "@repo/types";

export interface ReductionProjectFormValues {
  name: string;
  organizationId: string;
  carbonInventoryId: string;
  implementationDate: string;
  description: string;
  subcategoryId: string;
  gwpUsed: GwpSource | "";
  consideredGei: ConsideredGei[];
  reportedElsewhere: boolean;
  reportedElsewhereDescription: string;
  year: number | "";
  baselineScenario: string;
  projectScenario: string;
  sworn: boolean;
  files: File[];
}

export const defaultFormValues: ReductionProjectFormValues = {
  name: "",
  organizationId: "",
  carbonInventoryId: "",
  implementationDate: "",
  description: "",
  subcategoryId: "",
  gwpUsed: "",
  consideredGei: [],
  reportedElsewhere: false,
  reportedElsewhereDescription: "",
  year: "",
  baselineScenario: "",
  projectScenario: "",
  sworn: false,
  files: [],
};
