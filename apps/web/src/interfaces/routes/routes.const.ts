export const Routes = {
  LANDING: "/",
  CARBON_INVENTORY_BUSINESS_PROFILING:
    "/carbon-inventory/$inventoryId/business-profiling",
  CARBON_INVENTORY_SUBCATEGORY_PRESELECTION:
    "/carbon-inventory/$inventoryId/subcategory-preselection",
  CARBON_INVENTORY_EMISSION_CAPTURE:
    "/carbon-inventory/$inventoryId/emission-capture",
  CARBON_INVENTORIES: "/app/carbon-inventories",
  CARBON_INVENTORY_EMISSION_SUMMARY:
    "/carbon-inventory/$inventoryId/emission-summary",
  CARBON_INVENTORY_EMISSION_RESULTS:
    "/carbon-inventory/$inventoryId/emission-results",
  APP: "/app",
  HOME: "/app/home",
  MY_ORGANIZATION: "/app/my-organization",
  CARBON_INVENTORY: "/carbon-inventory",
  REDUCTION_PROJECTS: "/app/reduction-projects",
  REDUCTION_PROJECT: "/app/reduction-projects/$id",
  REDUCTION_PROJECT_NEW: "/app/reduction-projects/new",
  REDUCTION_PLAN: "/app/reduction-plan",
  RECOGNITIONS: "/app/recognitions",
  USER_FORM: "/app/user/form",
  ABOUT_US: "/about",
  TRANSPARENCY: "/transparency",
  CAPINAUT: "/capinaut",
  SIGN_IN: "/sign-in",
  ADMIN: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_METHODOLOGIES: "/admin/methodologies",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_ITEMS: "/admin/items",
  ADMIN_SUBCATEGORIES: "/admin/subcategories",
  ADMIN_DIMENSIONS: "/admin/dimensions",
  ADMIN_EMISSION_FACTORS: "/admin/emission-factors",
  ADMIN_UNITS: "/admin/units",
  ADMIN_PARAMETERS: "/admin/parameters",
  ADMIN_MAIN_ACTIVITIES: "/admin/main-activities",
  ADMIN_REQUESTS: "/admin/requests",
  ADMIN_ORGANIZATIONS: "/admin/organizations",
} as const;

export type Route = (typeof Routes)[keyof typeof Routes];
