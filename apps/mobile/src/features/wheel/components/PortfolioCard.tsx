import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { deployedColor, money, pnlColor, signedMoney } from "../format";
import type {
  Portfolio,
  PortfolioMetrics,
  Trade,
  StockLot,
} from "../types";

type Props = {
  portfolio: Portfolio;
  openTrades: Trade[];
  openLots: StockLot[];
  metrics?: PortfolioMetrics;
};

export function PortfolioCard({
  portfolio,
  openTrades,
  openLots,
  metrics,
}: Props) {
  const trades = openTrades.filter((t) => t.portfolioId === portfolio.id);
  const lots = openLots.filter((l) => l.portfolioId === portfolio.id);
  const openPremium = trades.reduce(
    (sum, t) => sum + t.contractPrice * t.contractsOpen * 100,
    0,
  );

  return (
    <Pressable
      onPress={() => router.push(`/wheel/portfolios/${portfolio.id}`)}
      className="rounded-xl border border-slate-800 bg-slate-900 p-4 active:bg-slate-800/80 gap-2"
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-base font-semibold text-white">
          {portfolio.name}
        </Text>
        {openPremium > 0 ? (
          <Text className="text-sm text-emerald-300">
            {money(openPremium, true)} open
          </Text>
        ) : null}
      </View>
      <Text className="text-xs text-slate-500">
        {trades.length} open trade{trades.length === 1 ? "" : "s"} ·{" "}
        {lots.length} stock lot{lots.length === 1 ? "" : "s"}
      </Text>
      {metrics ? (
        <View className="flex-row items-baseline gap-3 mt-1">
          <Text className="text-xs text-slate-500">
            MTD{" "}
            <Text className={`font-medium ${pnlColor(metrics.realizedMTD)}`}>
              {signedMoney(metrics.realizedMTD, true)}
            </Text>
          </Text>
          <Text className="text-xs text-slate-500">
            Deployed{" "}
            <Text
              className={`font-medium ${deployedColor(metrics.percentCapitalDeployed)}`}
            >
              {metrics.percentCapitalDeployed.toFixed(0)}%
            </Text>
          </Text>
          {metrics.winRate != null ? (
            <Text className="text-xs text-slate-500">
              Win{" "}
              <Text className="font-medium text-slate-300">
                {(metrics.winRate * 100).toFixed(0)}%
              </Text>
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
