import { FileTypeSchema } from "./schemas.js";

export const FileType = FileTypeSchema.enum;

export type FileType = (typeof FileType)[keyof typeof FileType];
