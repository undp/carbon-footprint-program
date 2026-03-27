import "@mui/material/styles";
import { SubmissionType as RequestType } from "@repo/types";

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
    requestTypeColors: Record<RequestType, string>;
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
    requestTypeColors?: Record<RequestType, string>;
  }
}
