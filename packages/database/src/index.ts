// Import the Prisma client as a namespace (works with CJS interop)
import * as PrismaClientModule from "./generated/client/index.js";

// Re-export everything from the module
// This approach works better with CJS modules because we're explicitly importing the namespace
export const {
  PrismaClient,
  Prisma,
  // Enums
  Magnitude,
  MethodologyVersionStatus,
  EmissionFactorStatus,
  InventoryStatus,
  UsageMode,
  CarbonInventoryLineStatus,
  InputType,
} = PrismaClientModule;

// Re-export types - these come from the TypeScript declaration files
export type * from "./generated/client/index.js";

export * from "./adapter.js";
