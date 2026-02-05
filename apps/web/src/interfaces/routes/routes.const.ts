export const Routes = {
  LANDING: "/",
  CARBON_INVENTORY_BUSINESS_PROFILING:
    "/app/carbon-inventory/$inventoryId/business-profiling",
  CARBON_INVENTORY_SUBCATEGORY_PRESELECTION:
    "/app/carbon-inventory/$inventoryId/subcategory-preselection",
  CARBON_INVENTORY_EMISSION_CAPTURE:
    "/app/carbon-inventory/$inventoryId/emission-capture",
  CARBON_INVENTORIES: "/app/carbon-inventories",
  HOME: "/app/home",
  MY_ORGANIZATION: "/app/my-organization",
  CARBON_INVENTORY: "/app/carbon-inventory",
  REDUCTION_PROJECTS: "/app/reduction-projects",
  REDUCTION_PLAN: "/app/reduction-plan",
  AWARDS: "/app/awards",
  USER_FORM: "/app/user/form",
  ABOUT_US: "/about",
  TRANSPARENCY: "/transparency",
  CAPINAUT: "/capinaut",
  SIGN_IN: "/sign-in",
} as const;

export type Route = (typeof Routes)[keyof typeof Routes];
