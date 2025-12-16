export const countryOrganizationSizeKeys = {
  all: ["countryOrganizationSizes"] as const,
  list: () => [...countryOrganizationSizeKeys.all, "list"] as const,
};
