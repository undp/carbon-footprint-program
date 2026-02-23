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
