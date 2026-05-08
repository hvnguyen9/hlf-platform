-- Assets and liabilities for proper net worth calculation
-- Plus wheel strategy fields on FIREProfile

CREATE TYPE "BtAssetType"     AS ENUM ('real_estate', 'vehicle', 'cash', 'other');
CREATE TYPE "BtLiabilityType" AS ENUM ('mortgage', 'car_loan', 'student_loan', 'credit_card', 'other');

CREATE TABLE IF NOT EXISTS "BtAsset" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "type"      "BtAssetType" NOT NULL,
  "value"     DECIMAL(18,2) NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BtAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BtAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BtAsset_userId_idx" ON "BtAsset"("userId");

CREATE TABLE IF NOT EXISTS "BtLiability" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "type"      "BtLiabilityType" NOT NULL,
  "balance"   DECIMAL(18,2) NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BtLiability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BtLiability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BtLiability_userId_idx" ON "BtLiability"("userId");

-- Wheel FIRE fields on FIREProfile
ALTER TABLE "FIREProfile"
  ADD COLUMN IF NOT EXISTS "wheelMonthlyRate"          DECIMAL(5,4) NOT NULL DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS "additionalRetirementSpend" DECIMAL(18,2) NOT NULL DEFAULT 0;
