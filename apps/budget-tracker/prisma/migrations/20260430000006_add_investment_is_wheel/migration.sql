-- Flag investment accounts usable for the Wheel strategy (taxable accounts only)
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "isWheelAccount" BOOLEAN NOT NULL DEFAULT false;
