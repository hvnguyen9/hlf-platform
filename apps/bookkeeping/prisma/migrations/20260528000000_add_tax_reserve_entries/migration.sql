-- Tax reserve tracker: log money set aside for taxes (`parked`) and estimated
-- payments actually sent (`paid`). One row per cash movement, counted once.

CREATE TYPE "TaxReserveKind" AS ENUM ('parked', 'paid');

CREATE TABLE "TaxReserveEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "kind" "TaxReserveKind" NOT NULL DEFAULT 'parked',
    "quarter" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReserveEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaxReserveEntry_userId_year_idx" ON "TaxReserveEntry"("userId", "year");
