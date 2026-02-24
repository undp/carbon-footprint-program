import { z } from "zod";
import { FileTypeSchema } from "./baseSchemas.js";
import type { BadgeSchema, FileSchema } from "./baseSchemas.js";

export const FileType = FileTypeSchema.enum;
export type FileType = (typeof FileType)[keyof typeof FileType];

export type File = z.infer<typeof FileSchema>;
export type Badge = z.infer<typeof BadgeSchema>;
