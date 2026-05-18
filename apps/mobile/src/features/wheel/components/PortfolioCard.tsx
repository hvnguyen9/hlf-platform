import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { money } from "../format";
import type { Portfolio, Trade, StockLot } from "../types";

type Props = {
  portfolio: Portfolio;
  openTrades: Trade[];
  openLots: StockLot[];
};

export function PortfolioCard({ portfolio, openTrades, openLots }: Props) {
  const trades = openTrades.filter((t) => t.portfolioId === portfolio.id);
  const lots = openLots.filter((l) => l.portfolioId === portfolio.id);
  const openPremium = trades.reduce(
    (sum, t) => sum + t.contractPrice * t.contractsOpen * 100,
    0,
  );

  return (
    <Pressable
      onPress={() => router.push(`/wheel/portfolios/${portfolio.id}`)}
      className="rounded-xl border border-slate-800 bg-slate-900 p-4 active:bg-slate-800/80"
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-base font-semibold text-white">
          {portfolio.name}
        </Text>
        {openPremium > 0 ? (
          <Text className="text-sm text-emerald-300">
            {money(openPremium, true)}
          </Text>
        ) : null}
      </View>
      <Text className="text-xs text-slate-500 mt-1">
        {trades.length} open trade{trades.length === 1 ? "" : "s"} ·{" "}
        {lots.length} stock lot{lots.length === 1 ? "" : "s"}
        {openPremium > 0 ? " · open premium" : ""}
      </Text>
    </Pressable>
  );
}
