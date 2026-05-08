-- Add RecurringTransaction table for monthly fixed income/expenses

CREATE TABLE IF NOT EXISTS "RecurringTransaction" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL,
  "amount"      DECIMAL(18,2) NOT NULL,
  "type"        "BtTransactionType" NOT NULL,
  "categoryId"  TEXT,
  "description" TEXT,
  "notes"       TEXT,
  "dayOfMonth"  INTEGER NOT NULL DEFAULT 1,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecurringTransaction_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RecurringTransaction_userId_isActive_idx"
  ON "RecurringTransaction"("userId", "isActive");
