import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

type Palette = typeof colors.light;

/**
 * Returns the design tokens for the current color scheme.
 * Falls back to the light palette when dark mode is not available.
 */
export function useColors(): Palette & { radius: number } {
  const scheme = useColorScheme();
  const palette: Palette =
    scheme === "dark" && "dark" in colors ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
