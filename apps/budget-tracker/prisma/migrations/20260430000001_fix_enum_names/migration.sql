-- Rename budget-tracker enums to avoid collisions with wheel-strat-tracker's
-- TransactionType (deposit|withdrawal) and any other shared enum names.

-- 1. Create correctly-named enums
CREATE TYPE "BtTransactionType" AS ENUM ('income', 'expense');
CREATE TYPE "BtCategoryType"    AS ENUM ('income', 'expense', 'both');
CREATE TYPE "BtInvestmentType"  AS ENUM ('brokerage', '401k', 'IRA', 'roth', 'crypto', 'real_estate', 'other');

-- 2. Alter Transaction.type
ALTER TABLE "Transaction"
  ALTER COLUMN "type" TYPE "BtTransactionType"
  USING "type"::text::"BtTransactionType";

-- 3. Alter Category.type — drop default first, change type, restore default
ALTER TABLE "Category" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Category"
  ALTER COLUMN "type" TYPE "BtCategoryType"
  USING "type"::text::"BtCategoryType";
ALTER TABLE "Category" ALTER COLUMN "type" SET DEFAULT 'expense'::"BtCategoryType";

-- 4. Alter Investment.type
ALTER TABLE "Investment"
  ALTER COLUMN "type" TYPE "BtInvestmentType"
  USING "type"::text::"BtInvestmentType";

-- 5. Drop the old incorrectly-used enums (NOT TransactionType — that belongs to wheel-strat-tracker)
DROP TYPE IF EXISTS "CategoryType";
DROP TYPE IF EXISTS "InvestmentType";
