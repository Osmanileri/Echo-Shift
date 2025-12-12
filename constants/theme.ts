/**
 * Color palette extracted from Figma design system
 * Organized with semantic naming for better maintainability
 */

export const Colors = {
  // Primary Lilac Scale
  lilac: {
    100: "#F2EEF8", // Lightest lilac - backgrounds, subtle highlights
    200: "#E1D9EE", // Very light lilac - light backgrounds
    300: "#D2C6E6", // Light lilac - borders, dividers
    400: "#C3B1E1", // Medium light lilac - inactive states
    500: "#B49CDA", // Medium lilac - secondary actions
    600: "#A587D3", // Base lilac - primary brand color
    700: "#9673CC", // Medium dark lilac - hover states
    800: "#875EC5", // Dark lilac - active states
    900: "#7849B6", // Darkest lilac - primary brand color
  },

  // Secondary Green Scale
  green: {
    100: "#F2F8EF", // Lightest green - success backgrounds
    200: "#E1EFDB", // Very light green - light success states
    300: "#D2E6CE", // Light green - success borders
    400: "#A8D8C0", // Medium light green - success highlights
    500: "#97C9AE", // Medium green - success secondary
    600: "#87B99D", // Base green - success primary
    700: "#76A98C", // Medium dark green - success hover
    800: "#659A7B", // Dark green - success active
    900: "#548A6A", // Darkest green - primary brand color
  },

  // Neutral/Dark Scale
  purple: {
    100: "#F2F0F4", // Lightest neutral - light backgrounds
    200: "#E1DDE6", // Very light neutral - subtle backgrounds
    300: "#D1CADD", // Light neutral - borders, dividers
    400: "#5A4D6A", // Medium neutral - secondary text
    500: "#52465F", // Medium dark neutral - body text
    600: "#4A3F55", // Base neutral - primary text
    700: "#41384A", // Dark neutral - headings
    800: "#393140", // Darkest neutral - emphasis text
    900: "#312A35", // Darkest neutral - primary brand color
  },

  // Beige Scale
  beige: {
    100: "#FDFBF9", // Lightest beige - backgrounds
    200: "#FBF7F2", // Very light beige - subtle backgrounds
    300: "#FAF5ED", // Light beige - borders, dividers
    400: "#F8F2E6", // Medium light beige - secondary text
    500: "#E9E0D4", // Medium beige - body text
    600: "#DAD9C3", // Medium dark beige - primary text
    700: "#CBC2B2", // Dark beige - headings
    800: "#BCAA91", // Darker beige - emphasis text
    900: "#AFA280", // Darkest beige - primary brand color
  },

  // Accent Colors
  accent: {
    lilac: "#7849B6", // Primary accent lilac
    green: "#548A6A", // Success accent green
    dark: "#312A35", // Dark accent for contrast
    light: "#AFA280", // Light accent for highlights
  },

  // Semantic Colors
  semantic: {
    // Success colors (using green scale)
    success: {
      light: "#E7F6E5",
      main: "#0DA500",
      dark: "#074302",
    },

    // Error colors (red scale)
    error: {
      light: "#FFE5E5",
      main: "#FF0000",
      dark: "#400000",
    },

    // Warning colors (yellow scale)
    warning: {
      light: "#FFFCE5",
      main: "#FFE600",
      dark: "#403900",
    },

    // Info colors (using lilac scale)
    info: {
      light: "#F2EEF8",
      main: "#875EC5",
      dark: "#5200B7",
    },
  },

  // Gray Scale
  gray: {
    100: "#ECEDEE", // Lightest gray - backgrounds
    200: "#D0D1D4", // Very light gray - borders
    300: "#A1A4AA", // Light gray - disabled text
    400: "#737780", // Medium gray - secondary text
    500: "#444955", // Medium dark gray - body text
    600: "#333740", // Base gray - primary text
    700: "#22252B", // Dark gray - headings
    800: "#111215", // Darkest gray - emphasis
  },

  // Background Colors
  background: {
    primary: "#FFFFFF", // Main background
    secondary: "#F2F0F4", // Secondary background
    tertiary: "#E1DDE6", // Tertiary background
    dark: "#111215", // Dark background
    surface: "#FFFFFF", // Surface/card background
    overlay: "rgba(0, 0, 0, 0.5)", // Modal overlay
  },

  // Text Colors
  text: {
    primary: "#393140", // Primary text
    secondary: "#52465F", // Secondary text
    tertiary: "#737780", // Tertiary text
    disabled: "#A1A4AA", // Disabled text
    inverse: "#FFFFFF", // Text on dark backgrounds
    accent: "#7849B6", // Accent text (lilac)
  },

  // Border Colors
  border: {
    light: "#D1CADD", // Light borders
    medium: "#A1A4AA", // Medium borders
    dark: "#52465F", // Dark borders
    focus: "#875EC5", // Focus border (lilac)
  },
};
