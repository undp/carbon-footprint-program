import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeText {
    hint: string;
  }

  interface CommonColors {
    deepForest: string;
    brightGreen: string;
  }

  interface CategoryColors {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
    background: string;
  }

  interface Palette {
    other: {
      backdrop: string;
      filledInput: string;
      tooltip: string;
      snackbar: string;
      ratingFull: string;
      fluor: string;
    };
    categories?: {
      category1?: CategoryColors;
      category2?: CategoryColors;
      category3?: CategoryColors;
    };
  }

  interface PaletteOptions {
    other?: {
      backdrop?: string;
      filledInput?: string;
      tooltip?: string;
      snackbar?: string;
      ratingFull?: string;
      fluor?: string;
    };
    categories?: {
      category1?: CategoryColors;
      category2?: CategoryColors;
      category3?: CategoryColors;
    };
  }
}
