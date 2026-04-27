import type { AdminListStatusFilter } from "@repo/types";

export const countrySubsectorKeys = {
  all: ["countrySubsectors"] as const,
  admin: {
    all: ["countrySubsectors", "admin"] as const,
    list: (status: AdminListStatusFilter) =>
      ["countrySubsectors", "admin", "list", status] as const,
  },
};
