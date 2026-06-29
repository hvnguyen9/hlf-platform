-- PMCC support: a CoveredCall can be covered by a long Call (LEAP) instead of
-- a stock lot. Add a self-referencing nullable FK on Trade. Additive only —
-- existing rows get NULL (still covered by their stock lot as before).

ALTER TABLE "Trade" ADD COLUMN "coveringTradeId" TEXT;

CREATE INDEX "Trade_coveringTradeId_idx" ON "Trade"("coveringTradeId");

ALTER TABLE "Trade"
  ADD CONSTRAINT "Trade_coveringTradeId_fkey"
  FOREIGN KEY ("coveringTradeId") REFERENCES "Trade"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
