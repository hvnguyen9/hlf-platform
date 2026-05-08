-- Mark expense categories as savings buckets so savings rate reflects
-- intentional allocation rather than income minus all expenses.
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isSavings" BOOLEAN NOT NULL DEFAULT false;
