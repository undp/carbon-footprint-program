import "@mui/material/styles";
import { SubmissionType, CarbonInventoryRecognitionsType } from "@repo/types";
import { StatusFamily } from "@/labels/chips/types";

declare module "@mui/material/styles" {
  interface TypeText {
    hint: string;
  }

  interface CommonColors {
    deepNavy: string;
    deepNavyDark: string;
    leafGreen: string;
    softLeaf: string;
    oceanTeal: string;
    sunflower: string;
  }

  interface Palette {
    other: {
      backdrop: string;
      filledInput: string;
      tooltip: string;
      snackbar: string;
      ratingFull: string;
      accent: string;
      gradient: string;
      gradient20: string;
    };
    submissionTypeColors: Record<SubmissionType, string>;
    recognitionTypeColors: Record<CarbonInventoryRecognitionsType, string>;
    roleColors: Record<"USER" | "ADMIN" | "SUPERADMIN", string>;
    statusFamilyColors: Record<StatusFamily, string>;
  }

  interface PaletteOptions {
    other?: {
      backdrop?: string;
      filledInput?: string;
      tooltip?: string;
      snackbar?: string;
      ratingFull?: string;
      accent?: string;
      gradient?: string;
      gradient20?: string;
    };
    submissionTypeColors?: Record<SubmissionType, string>;
    recognitionTypeColors?: Record<CarbonInventoryRecognitionsType, string>;
    roleColors?: Record<"USER" | "ADMIN" | "SUPERADMIN", string>;
    statusFamilyColors?: Record<StatusFamily, string>;
  }
}
