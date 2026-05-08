-- Budget Tracker: initial tables
-- Additive only — does not touch existing tables from hlf-bookkeeping or wheel-strat-tracker

-- Enums (only create if they don't exist)
DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CategoryType" AS ENUM ('income', 'expense', 'both');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvestmentType" AS ENUM ('brokerage', '401k', 'IRA', 'roth', 'crypto', 'real_estate', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Categories
CREATE TABLE IF NOT EXISTS "Category" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "color"         TEXT NOT NULL DEFAULT '#6366f1',
  "icon"          TEXT NOT NULL DEFAULT 'tag',
  "type"          "CategoryType" NOT NULL DEFAULT 'expense',
  "monthlyBudget" DECIMAL(18,2),
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  "order"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Category_userId_name_key" UNIQUE ("userId", "name"),
  CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Category_userId_type_idx" ON "Category"("userId", "type");

-- Transactions
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL,
  "amount"      DECIMAL(18,2) NOT NULL,
  "type"        "TransactionType" NOT NULL,
  "categoryId"  TEXT,
  "description" TEXT,
  "notes"       TEXT,
  "date"        TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX IF NOT EXISTS "Transaction_userId_type_date_idx" ON "Transaction"("userId", "type", "date");
CREATE INDEX IF NOT EXISTS "Transaction_userId_categoryId_date_idx" ON "Transaction"("userId", "categoryId", "date");

-- MonthlyBudget
CREATE TABLE IF NOT EXISTS "MonthlyBudget" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"       TEXT NOT NULL,
  "month"        INTEGER NOT NULL,
  "year"         INTEGER NOT NULL,
  "categoryId"   TEXT NOT NULL,
  "budgetAmount" DECIMAL(18,2) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MonthlyBudget_userId_year_month_categoryId_key" UNIQUE ("userId", "year", "month", "categoryId"),
  CONSTRAINT "MonthlyBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MonthlyBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MonthlyBudget_userId_year_month_idx" ON "MonthlyBudget"("userId", "year", "month");

-- NetWorthSnapshot
CREATE TABLE IF NOT EXISTS "NetWorthSnapshot" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"           TEXT NOT NULL,
  "date"             TIMESTAMP(3) NOT NULL,
  "totalAssets"      DECIMAL(18,2) NOT NULL,
  "totalLiabilities" DECIMAL(18,2) NOT NULL,
  "netWorth"         DECIMAL(18,2) NOT NULL,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NetWorthSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NetWorthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "NetWorthSnapshot_userId_date_idx" ON "NetWorthSnapshot"("userId", "date");

-- Investment
CREATE TABLE IF NOT EXISTS "Investment" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"       TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "type"         "InvestmentType" NOT NULL,
  "currentValue" DECIMAL(18,2) NOT NULL,
  "lastUpdated"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Investment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Investment_userId_type_idx" ON "Investment"("userId", "type");

-- FIREProfile
CREATE TABLE IF NOT EXISTS "FIREProfile" (
  "userId"               TEXT NOT NULL,
  "targetAnnualExpenses" DECIMAL(18,2) NOT NULL,
  "safeWithdrawalRate"   DECIMAL(5,4) NOT NULL DEFAULT 0.04,
  "targetRetirementAge"  INTEGER,
  "currentAge"           INTEGER,
  "expectedReturn"       DECIMAL(5,4) NOT NULL DEFAULT 0.07,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FIREProfile_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "FIREProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- SavingsGoal
CREATE TABLE IF NOT EXISTS "SavingsGoal" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "targetAmount"  DECIMAL(18,2) NOT NULL,
  "currentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "deadline"      TIMESTAMP(3),
  "description"   TEXT,
  "isCompleted"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavingsGoal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SavingsGoal_userId_isCompleted_idx" ON "SavingsGoal"("userId", "isCompleted");
