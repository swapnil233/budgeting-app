/**
 * Maps Plaid Personal Finance Category (PFC) primary values to the app's
 * CATEGORY_GROUP enum, used when auto-creating categories during import.
 */

export const PLAID_PFC_TO_GROUP: Record<string, string> = {
  // Income
  INCOME: "INCOME",
  TRANSFER_IN: "INCOME",

  // Fixed
  RENT_AND_UTILITIES: "FIXED",
  LOAN_PAYMENTS: "FIXED",
  TRANSPORTATION: "FIXED",
  MEDICAL: "FIXED",
  BANK_FEES: "FIXED",
  HOME_IMPROVEMENT: "FIXED",

  // Food
  FOOD_AND_DRINK: "FOOD",

  // Lifestyle
  ENTERTAINMENT: "LIFESTYLE",
  GENERAL_MERCHANDISE: "LIFESTYLE",
  PERSONAL_CARE: "LIFESTYLE",
  TRAVEL: "LIFESTYLE",

  // Other
  TRANSFER_OUT: "OTHER",
  GENERAL_SERVICES: "OTHER",
  GOVERNMENT_AND_NON_PROFIT: "OTHER",
};

/** Returns the CATEGORY_GROUP for a Plaid PFC primary value, defaulting to OTHER. */
export function getGroupForPfc(pfc: string | null): string {
  if (!pfc) return "OTHER";
  return PLAID_PFC_TO_GROUP[pfc] ?? "OTHER";
}

/** Converts a PFC key like FOOD_AND_DRINK to "Food And Drink". */
export function formatPfcName(pfc: string): string {
  return pfc
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
