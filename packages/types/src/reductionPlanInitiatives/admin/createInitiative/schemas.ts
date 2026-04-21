import { InitiativeMutationDataSchema } from "../schemas.js";
import { AdminInitiativeListItemSchema } from "../getAllInitiatives/schemas.js";

export const CreateInitiativeRequestSchema = InitiativeMutationDataSchema;

export const CreateInitiativeResponseSchema = AdminInitiativeListItemSchema;
