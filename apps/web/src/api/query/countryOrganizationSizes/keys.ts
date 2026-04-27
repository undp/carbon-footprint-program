import type { AdminListStatusFilter } from "@repo/types";

export const countryOrganizationSizeKeys = {
  all: ["countryOrganizationSizes"] as const,
  app: {
    all: ["countryOrganizationSizes"] as const,
  },
  admin: {
    all: ["countryOrganizationSizes", "admin"] as const,
    list: (status: AdminListStatusFilter) =>
      ["countryOrganizationSizes", "admin", "list", status] as const,
  },
};
