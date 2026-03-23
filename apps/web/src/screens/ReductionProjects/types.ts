export type {
  ReductionProjectSummary,
  GetAllReductionProjectsResponse,
  SealApplication as ApiSealApplication,
  GetAllSealApplicationsResponse,
  ReductionProjectStatus,
} from "@repo/types";

export type Branch = {
  id: string;
  name: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type OrganizationInfo = {
  legalName: string;
  rut: string;
  legalRepresentative: string;
};

export type GreenhouseGas =
  | "CO2"
  | "CH4"
  | "HIDROFLUOROCARBONADOS"
  | "PERFLUOROCARBONADOS"
  | "SF6"
  | "NF3";

export type AddReductionProjectFormData = {
  projectName: string;
  branch: string;
  implementationDate: string;
  emissionSubcategory: string;
  projectDescription: string;
  pcg: string;
  selectedGases: GreenhouseGas[];
  reportedInOtherInitiative: boolean;
  otherInitiativeDescription: string;
  reductionYear: string;
  baselineValue: number | "";
  projectValue: number | "";
};
