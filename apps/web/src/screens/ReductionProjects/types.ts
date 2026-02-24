export type ReductionProject = {
  id: string;
  name: string;
  implementationDate: string;
  firstReportDate: string;
  reductionTCO2e: number;
  yearsReported: number;
};

export type SealApplication = {
  id: string;
  reductionYear: number;
  applicationDate: string;
  sealName: string;
  status: SealApplicationStatus;
};

export type SealApplicationStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type Branch = {
  id: string;
  name: string;
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
  reportedInOtherInitiative: boolean;
  includedInNDC: boolean;
  selectedGases: GreenhouseGas[];
  reductionYear: string;
  baselineValue: number;
  projectValue: number;
  carbonLeakage: number;
  removals: number;
  totalReduction: number;
};
