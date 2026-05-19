import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useStockLot } from "@/features/wheel/queries";
import { useSellShares } from "@/features/wheel/mutations";
import { FormField } from "@/features/wheel/components/FormField";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";
import { money } from "@/features/wheel/format";

export default function SellSharesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lot = useStockLot(id);
  const sell = useSellShares();

  const [closePrice, setClosePrice] = useState("");
  const [sharesToClose, setSharesToClose] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (lot.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100 dark:bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (!lot.data) return null;
  const data = lot.data;
  const coveredShares =
    data.trades?.reduce(
      (sum, t) =>
        t.status === "open" && t.type === "CoveredCall"
          ? sum + t.contractsOpen * 100
          : sum,
      0,
    ) ?? 0;
  const sellable = data.shares - coveredShares;

  async function handleSubmit() {
    setFormError(null);
    const cp = Number(closePrice);
    if (!Number.isFinite(cp) || cp <= 0) {
      setFormError("Close price must be a positive number");
      return;
    }
    const shares = sharesToClose.trim()
      ? Math.trunc(Number(sharesToClose))
      : sellable;
    if (!Number.isInteger(shares) || shares <= 0 || shares > sellable) {
      setFormError(`Shares must be 1–${sellable}`);
      return;
    }
    try {
      await sell.mutateAsync({
        stockLotId: data.id,
        closePrice: cp,
        sharesToClose: shares,
      });
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sell failed");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-100 dark:bg-slate-950"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <View>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">
              Sell {data.ticker}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              {data.shares} shares · avg ${data.avgCost.toFixed(2)} · basis{" "}
              {money(data.shares * data.avgCost)}
            </Text>
          </View>

          <View className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 gap-1">
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Total shares</Text>
              <Text className="text-sm text-slate-800 dark:text-slate-200">{data.shares}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Covered by open CCs</Text>
              <Text className="text-sm text-slate-800 dark:text-slate-200">{coveredShares}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Sellable now</Text>
              <Text
                className={`text-sm font-medium ${
                  sellable > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500"
                }`}
              >
                {sellable}
              </Text>
            </View>
          </View>

          <FormField
            label="Close price"
            value={closePrice}
            onChangeText={setClosePrice}
            keyboardType="decimal-pad"
            placeholder="180.50"
          />

          <FormField
            label="Shares to sell"
            hint={`Leave blank to sell all ${sellable}`}
            value={sharesToClose}
            onChangeText={setSharesToClose}
            keyboardType="number-pad"
            placeholder={String(sellable)}
          />

          {formError ? (
            <Text className="text-sm text-rose-400">{formError}</Text>
          ) : null}

          <SubmitBar
            label="Sell shares"
            onPress={handleSubmit}
            loading={sell.isPending}
            disabled={sellable <= 0}
          />
          {sellable <= 0 ? (
            <Text className="text-xs text-amber-700 dark:text-amber-300 text-center">
              All shares are covered by open CCs. Close those first.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
