-- Lot alerts: extend AlertConfig with a stock-lot binding and a new
-- LOT_PRICE_BREACH alert type so users can set price triggers against
-- their open StockLots (e.g. "alert when underlying drops 5% below avg
-- cost" or "alert when it rises above $X").

-- AlterEnum: add the new alert type. Safe in PG 12+ inside a tx as long
-- as the new value isn't read in the same migration.
ALTER TYPE "AlertConfigType" ADD VALUE 'LOT_PRICE_BREACH';

-- AlterTable: add the optional stockLotId binding.
ALTER TABLE "AlertConfig" ADD COLUMN "stockLotId" TEXT;

-- CreateIndex: lookup configs by lot for the engine + UI list.
CREATE INDEX "AlertConfig_userId_stockLotId_idx" ON "AlertConfig"("userId", "stockLotId");
