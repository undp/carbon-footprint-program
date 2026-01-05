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
    category: {
      one: CategoryColors;
      two: CategoryColors;
      three: CategoryColors;
      [key: number]: CategoryColors;
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
    category?: {
      one?: CategoryColors;
      two?: CategoryColors;
      three?: CategoryColors;
      [key: number]: CategoryColors;
    };
  }
}
