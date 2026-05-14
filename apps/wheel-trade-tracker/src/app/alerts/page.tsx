import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import { redirect } from "next/navigation";
import prisma from "@/server/prisma";
import { AlertsPageClient } from "@/features/alerts/components/AlertsPageClient";

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [events, configs] = await Promise.all([
    prisma.alertEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { firedAt: "desc" },
      take: 50,
      include: {
        config: { select: { id: true, type: true, tradeId: true, watchlistTicker: true } },
      },
    }),
    prisma.alertConfig.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tradeIds = configs
    .map((c) => c.tradeId)
    .filter((id): id is string => Boolean(id));
  const trades = tradeIds.length
    ? await prisma.trade.findMany({
        where: { id: { in: tradeIds } },
        select: {
          id: true,
          ticker: true,
          type: true,
          strikePrice: true,
          expirationDate: true,
          status: true,
          portfolioId: true,
        },
      })
    : [];
  const tradeById = new Map(trades.map((t) => [t.id, t]));

  const lotIds = configs
    .map((c) => c.stockLotId)
    .filter((id): id is string => Boolean(id));
  const lots = lotIds.length
    ? await prisma.stockLot.findMany({
        where: { id: { in: lotIds } },
        select: {
          id: true,
          ticker: true,
          shares: true,
          avgCost: true,
          status: true,
          portfolioId: true,
        },
      })
    : [];
  const lotById = new Map(lots.map((l) => [l.id, l]));

  return (
    <AlertsPageClient
      initialConfigs={configs.map((c) => ({
        id: c.id,
        type: c.type,
        enabled: c.enabled,
        params: c.params,
        tradeId: c.tradeId,
        watchlistTicker: c.watchlistTicker,
        stockLotId: c.stockLotId,
        lastFiredAt: c.lastFiredAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        trade: c.tradeId
          ? (() => {
              const t = tradeById.get(c.tradeId);
              if (!t) return null;
              return {
                id: t.id,
                ticker: t.ticker,
                type: t.type,
                strikePrice: t.strikePrice,
                expirationDate: t.expirationDate.toISOString(),
                status: t.status,
                portfolioId: t.portfolioId,
              };
            })()
          : null,
        stockLot: c.stockLotId
          ? (() => {
              const l = lotById.get(c.stockLotId);
              if (!l) return null;
              return {
                id: l.id,
                ticker: l.ticker,
                shares: l.shares,
                avgCost: l.avgCost.toString(),
                status: l.status,
                portfolioId: l.portfolioId,
              };
            })()
          : null,
      }))}
      initialEvents={events.map((e) => ({
        id: e.id,
        message: e.message,
        priceAtFire: e.priceAtFire,
        firedAt: e.firedAt.toISOString(),
        configType: e.config.type,
        tradeId: e.config.tradeId,
        watchlistTicker: e.config.watchlistTicker,
      }))}
    />
  );
}
