import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeText {
    hint: string;
  }

  interface CommonColors {
    deepForest: string;
    brightGreen: string;
  }

  interface Palette {
    other: {
      backdrop: string;
      filledInput: string;
      tooltip: string;
      snackbar: string;
      ratingFull: string;
    };
  }

  interface PaletteOptions {
    other?: {
      backdrop?: string;
      filledInput?: string;
      tooltip?: string;
      snackbar?: string;
      ratingFull?: string;
    };
  }
}
