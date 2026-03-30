"use client";

import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  colorSchemeDark,
} from "ag-grid-community";
import { useTheme } from "next-themes";

ModuleRegistry.registerModules([AllCommunityModule]);

export const lightTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 13,
  rowHeight: 40,
  headerHeight: 36,
  borderRadius: 0,
  wrapperBorderRadius: 0,
  cellHorizontalPaddingScale: 1.2,
});

export const darkTheme = lightTheme.withPart(colorSchemeDark);

export function useAgGridTheme() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? darkTheme : lightTheme;
}

// Shared add-row input class names
export const addRowInput =
  "h-7 rounded border-0 border-b border-border/60 bg-transparent px-1.5 text-sm outline-none focus:border-primary focus:bg-muted/40 transition-colors placeholder:text-muted-foreground/40 w-full";
export const addRowSelect = `${addRowInput} cursor-pointer`;

// Group constants used across transactions, categories, and budgets
export const GROUP_ORDER = [
  "INCOME",
  "FIXED",
  "SUBSCRIPTIONS",
  "FOOD",
  "LIFESTYLE",
  "PEOPLE_AND_PETS",
  "OTHER",
];

export const GROUP_LABELS: Record<string, string> = {
  INCOME: "Income",
  FIXED: "Fixed",
  SUBSCRIPTIONS: "Subscriptions",
  FOOD: "Food",
  LIFESTYLE: "Lifestyle",
  PEOPLE_AND_PETS: "People & Pets",
  OTHER: "Other",
};
