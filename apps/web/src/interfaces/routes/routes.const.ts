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
  REDUCTION_PROJECT_EDIT: "/app/reduction-projects/$id/edit",
  REDUCTION_PROJECT_DETAILS: "/app/reduction-projects/$id/details",
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
  ADMIN_SUBCATEGORIES: "/admin/subcategories",
  ADMIN_DIMENSIONS: "/admin/dimensions",
  ADMIN_EMISSION_FACTORS: "/admin/emission-factors",
  ADMIN_UNITS: "/admin/units",
  ADMIN_PARAMETERS: "/admin/parameters",
  ADMIN_SECTORS: "/admin/sectors",
  ADMIN_SUBSECTORS: "/admin/subsectors",
  ADMIN_MAIN_ACTIVITIES: "/admin/main-activities",
  ADMIN_ORGANIZATION_SIZES: "/admin/organization-sizes",
  ADMIN_REQUESTS: "/admin/requests",
  ADMIN_ORGANIZATIONS: "/admin/organizations",
  ADMIN_BADGES: "/admin/badges",
  ADMIN_SUBCATEGORY_RECOMMENDATIONS: "/admin/subcategory-recommendations",
  ADMIN_REDUCTION_PLAN_INITIATIVES: "/admin/reduction-plan-initiatives",
  ADMIN_EXPLANATIONS: "/admin/explanations",
  ADMIN_USERS: "/admin/users",
  ADMIN_CHANGE_HISTORY: "/admin/change-history",
} as const;

export type Route = (typeof Routes)[keyof typeof Routes];

// Route IDs used by TanStack Router (createFileRoute, getRouteApi, useParams({ from })).
// These differ from `Routes` for routes nested inside pathless layouts (_shell, _fullscreen):
// the route ID encodes the file location, while `Routes` holds the public URL.
export const RouteIds = {
  APP_SHELL: "/app/_shell",
  APP_SHELL_INDEX: "/app/_shell/",
  APP_FULLSCREEN: "/app/_fullscreen",
  HOME: "/app/_shell/home",
  MY_ORGANIZATION: "/app/_shell/my-organization",
  CARBON_INVENTORIES: "/app/_shell/carbon-inventories",
  REDUCTION_PLAN: "/app/_shell/reduction-plan",
  RECOGNITIONS: "/app/_shell/recognitions",
  REDUCTION_PROJECTS: "/app/_shell/reduction-projects",
  REDUCTION_PROJECTS_INDEX: "/app/_shell/reduction-projects/",
  USER_FORM: "/app/_shell/user/form",
  REDUCTION_PROJECT_NEW: "/app/_fullscreen/reduction-projects/new",
  REDUCTION_PROJECT_ID: "/app/_fullscreen/reduction-projects/$id",
  REDUCTION_PROJECT_DETAILS: "/app/_fullscreen/reduction-projects/$id/details",
  REDUCTION_PROJECT_EDIT: "/app/_fullscreen/reduction-projects/$id/edit",
} as const;

export type RouteId = (typeof RouteIds)[keyof typeof RouteIds];
