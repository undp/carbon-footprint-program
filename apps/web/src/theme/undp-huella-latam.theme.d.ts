import "@mui/material/styles";
import { SubmissionType, CarbonInventoryRecognitionsType } from "@repo/types";

declare module "@mui/material/styles" {
  interface TypeText {
    hint: string;
  }

  interface CommonColors {
    deepForest: string;
    brightGreen: string;
    glossyTeal: string;
  }

  interface Palette {
    other: {
      backdrop: string;
      filledInput: string;
      tooltip: string;
      snackbar: string;
      ratingFull: string;
      fluor: string;
      gradient: string;
      gradient20: string;
    };
    requestTypeColors: Record<SubmissionType, string>;
    recognitionTypeColors: Record<CarbonInventoryRecognitionsType, string>;
    roleColors: Record<"USER" | "ADMIN" | "SUPERADMIN", string>;
  }

  interface PaletteOptions {
    other?: {
      backdrop?: string;
      filledInput?: string;
      tooltip?: string;
      snackbar?: string;
      ratingFull?: string;
      fluor?: string;
      gradient?: string;
      gradient20?: string;
    };
    requestTypeColors?: Record<SubmissionType, string>;
    recognitionTypeColors?: Record<CarbonInventoryRecognitionsType, string>;
    roleColors?: Record<"USER" | "ADMIN" | "SUPERADMIN", string>;
  }
}
