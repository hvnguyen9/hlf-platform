export type TransactionType = "income" | "expense";
export type CategoryType = "income" | "expense" | "both";
export type BtAssetType = "real_estate" | "vehicle" | "cash" | "other";
export type BtLiabilityType = "mortgage" | "car_loan" | "student_loan" | "credit_card" | "other";

export type InvestmentType =
  | "brokerage"
  | "retirement_401k"
  | "IRA"
  | "roth_IRA"
  | "crypto"
  | "real_estate"
  | "other";

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
  monthlyBudget: number | null;
  isSavings: boolean;
  isDefault: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  category: Category | null;
  description: string | null;
  notes: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  isRecurring?: boolean;
  recurringId?: string;
}

export interface RecurringTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  category: Category | null;
  description: string | null;
  notes: string | null;
  dayOfMonth: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  id: string;
  userId: string;
  month: number;
  year: number;
  categoryId: string;
  category: Category;
  budgetAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetProgress {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  budgetAmount: number;
  actualAmount: number;
  remaining: number;
  monthlyBudgetId: string | null;
}

export interface NetWorthSnapshot {
  id: string;
  userId: string;
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  notes: string | null;
  createdAt: string;
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  currentValue: number;
  isWheelAccount: boolean;
  lastUpdated: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BtAsset {
  id: string;
  userId: string;
  name: string;
  type: BtAssetType;
  value: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BtLiability {
  id: string;
  userId: string;
  name: string;
  type: BtLiabilityType;
  balance: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FIREProfile {
  userId: string;
  targetAnnualExpenses: number;
  safeWithdrawalRate: number;
  targetRetirementAge: number | null;
  currentAge: number | null;
  expectedReturn: number;
  wheelMonthlyRate: number;
  additionalRetirementSpend: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  description: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlowLine {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
  recurring: number;
}

export interface ExpenseLine extends FlowLine {
  budget: number;
}

export interface DashboardSummary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalBudget: number;
  surplus: number;
  expenseBreakdown: ExpenseLine[];
  incomeBreakdown: FlowLine[];
  savingsBreakdown: FlowLine[];
}

export interface MonthlyReport {
  month: number;
  year: number;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}
