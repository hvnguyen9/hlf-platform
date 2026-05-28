export type EntryType = "income" | "expense";
export type EntrySource = "manual" | "trading";

export interface BookkeepingEntry {
  id: string;
  userId: string;
  type: EntryType;
  name?: string | null;
  category: string;
  amount: number;
  description?: string | null;
  date: string;
  source: EntrySource;
  recurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export const INCOME_CATEGORIES = [
  "Trading Profits",
  "Salary",
  "Freelance",
  "Consulting",
  "Blog Subscribers",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Trading Loss",
  "Technology & Hardware",
  "Software & Subscriptions",
  "Office Supplies",
  "Business Travel",
  "Home Office & Utilities",
  "Refund / Reversal",
  "Other Expense",
] as const;

/** Income categories subject to self-employment tax (Schedule C). */
export const SE_TAXABLE_CATEGORIES: ReadonlyArray<string> = [
  "Freelance",
  "Consulting",
  "Blog Subscribers",
];

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type TaxReserveKind = "parked" | "paid";

export interface TaxReserveEntry {
  id: string;
  userId: string;
  year: number;
  date: string;
  amount: number;
  kind: TaxReserveKind;
  quarter?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}
