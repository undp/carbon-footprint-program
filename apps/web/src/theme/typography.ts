/**
 * Typography Configuration for Material UI
 * Based on Figma Typography Setup
 */

export const typography = {
  // Font families
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',

  // Font sizes
  fontSize: 14, // Base font size in px
  htmlFontSize: 16, // Root font size

  // Font weights
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,

  // Heading styles
  h1: {
    fontWeight: 300, // Light
    fontSize: "6rem", // 96px
    lineHeight: 1.167, // 112px
    letterSpacing: "-0.015625em", // -1.5px
  },
  h2: {
    fontWeight: 300, // Light
    fontSize: "3.75rem", // 60px
    lineHeight: 1.2, // 72px
    letterSpacing: "-0.00833em", // -0.5px
  },
  h3: {
    fontWeight: 400, // Regular
    fontSize: "3rem", // 48px
    lineHeight: 1.167, // 56px
    letterSpacing: "0em", // 0px
  },
  h4: {
    fontWeight: 400, // Regular
    fontSize: "2.125rem", // 34px
    lineHeight: 1.235, // 42px
    letterSpacing: "0.00735em", // 0.25px
  },
  h5: {
    fontWeight: 400, // Regular
    fontSize: "1.5rem", // 24px
    lineHeight: 1.334, // 32px
    letterSpacing: "0em", // 0px
  },
  h6: {
    fontWeight: 500, // Medium
    fontSize: "1.25rem", // 20px
    lineHeight: 1.6, // 32px
    letterSpacing: "0.0075em", // 0.15px
  },

  // Subtitle styles
  subtitle1: {
    fontWeight: 400, // Regular
    fontSize: "1rem", // 16px
    lineHeight: 1.75, // 28px
    letterSpacing: "0.009375em", // 0.15px
  },
  subtitle2: {
    fontWeight: 500, // Medium
    fontSize: "0.875rem", // 14px
    lineHeight: 1.57, // 22px
    letterSpacing: "0.00714em", // 0.1px
  },

  // Body text styles
  body1: {
    fontWeight: 400, // Regular
    fontSize: "1rem", // 16px
    lineHeight: 1.5, // 24px
    letterSpacing: "0.009375em", // 0.15px
  },
  body2: {
    fontWeight: 400, // Regular
    fontSize: "0.875rem", // 14px
    lineHeight: 1.43, // 20px
    letterSpacing: "0.01071em", // 0.15px
  },

  // Button text
  button: {
    fontWeight: 500, // Medium
    fontSize: "0.875rem", // 14px
    lineHeight: 1.143, // 16px
    letterSpacing: "0.08929em", // 1.25px
    textTransform: "uppercase" as const,
  },

  // Caption and overline
  caption: {
    fontWeight: 400, // Regular
    fontSize: "0.75rem", // 12px
    lineHeight: 1.66, // 20px
    letterSpacing: "0.03333em", // 0.4px
  },
  overline: {
    fontWeight: 400, // Regular
    fontSize: "0.75rem", // 12px
    lineHeight: 2.66, // 32px
    letterSpacing: "0.125em", // 1.5px
    textTransform: "uppercase" as const,
  },
} as const;
