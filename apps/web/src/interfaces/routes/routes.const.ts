export const Routes = {
  // Root and top-level routes
  LANDING: "/",
  ABOUT_US: "/about",
  CAPINAUT: "/capinaut",
  TRANSPARENCY: "/transparency",
  SIGN_IN: "/sign-in",
  // Public OIDC redirect target — resolved before the /app and /admin guards.
  AUTH_CALLBACK: "/auth/callback",

  // Carbon inventory layout + nested routes
  CARBON_INVENTORY: "/carbon-inventory",
  CARBON_INVENTORY_BUSINESS_PROFILING:
    "/carbon-inventory/$inventoryId/business-profiling",
  CARBON_INVENTORY_SUBCATEGORY_PRESELECTION:
    "/carbon-inventory/$inventoryId/subcategory-preselection",
  CARBON_INVENTORY_EMISSION_CAPTURE:
    "/carbon-inventory/$inventoryId/emission-capture",
  CARBON_INVENTORY_EMISSION_SUMMARY:
    "/carbon-inventory/$inventoryId/emission-summary",
  CARBON_INVENTORY_EMISSION_RESULTS:
    "/carbon-inventory/$inventoryId/emission-results",
  // Post-login target: claims the anonymous draft for the authenticated user.
  CARBON_INVENTORY_CLAIM: "/carbon-inventory/$inventoryId/claim",

  // Admin layout + nested routes
  ADMIN: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_METHODOLOGIES: "/admin/methodologies",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_SUBCATEGORIES: "/admin/subcategories",
  ADMIN_DIMENSIONS: "/admin/dimensions",
  ADMIN_EMISSION_FACTORS: "/admin/emission-factors",
  ADMIN_UNITS: "/admin/units",
  ADMIN_MAGNITUDES: "/admin/magnitudes",
  ADMIN_RATE_MEASUREMENT_UNITS: "/admin/rate-measurement-units",
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

  // App layout
  APP: "/app",

  // App shell routes
  HOME: "/app/home",
  MY_ORGANIZATION: "/app/my-organization",
  CARBON_INVENTORIES: "/app/carbon-inventories",
  REDUCTION_PLAN: "/app/reduction-plan",
  RECOGNITIONS: "/app/recognitions",
  REDUCTION_PROJECTS: "/app/reduction-projects",
  USER_FORM: "/app/user/form",

  // App fullscreen routes
  REDUCTION_PROJECT_NEW: "/app/reduction-projects/new",
  REDUCTION_PROJECT_DETAILS: "/app/reduction-projects/$id/details",
  REDUCTION_PROJECT_EDIT: "/app/reduction-projects/$id/edit",
} as const;

export type Route = (typeof Routes)[keyof typeof Routes];
