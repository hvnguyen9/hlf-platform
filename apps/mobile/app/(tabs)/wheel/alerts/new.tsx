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
import { useStockLot, useTrade } from "@/features/wheel/queries";
import { useCreateAlert, type CreateAlertInput } from "@/features/alerts/queries";
import { Segmented } from "@/features/wheel/components/Segmented";
import { FormField } from "@/features/wheel/components/FormField";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";
import { TypeBadge } from "@/features/wheel/components/TypeBadge";

type TradeAlertType =
  | "PROFIT_TARGET"
  | "ASSIGNMENT_RISK"
  | "ROLL_OPPORTUNITY";

type LotMode = "absolute" | "pctBelowAvg" | "pctAboveAvg";
type Direction = "above" | "below";

export default function NewAlertScreen() {
  const params = useLocalSearchParams<{
    tradeId?: string;
    ticker?: string;
    stockLotId?: string;
  }>();
  const tradeId = params.tradeId;
  const ticker = params.ticker;
  const stockLotId = params.stockLotId;

  const trade = useTrade(tradeId);
  const lot = useStockLot(stockLotId);
  const create = useCreateAlert();
  const [formError, setFormError] = useState<string | null>(null);

  // Trade-bound form state
  const [tradeAlertType, setTradeAlertType] =
    useState<TradeAlertType>("PROFIT_TARGET");
  const [profitPct, setProfitPct] = useState("80");
  const [withinPctOfStrike, setWithinPctOfStrike] = useState("2");
  const [assignmentMaxDte, setAssignmentMaxDte] = useState("21");
  const [rollMaxDte, setRollMaxDte] = useState("7");
  const [rollMinOtmPct, setRollMinOtmPct] = useState("2");

  // Watchlist-bound form state
  const [breachDirection, setBreachDirection] = useState<Direction>("above");
  const [breachPrice, setBreachPrice] = useState("");

  // Lot-bound form state
  const [lotMode, setLotMode] = useState<LotMode>("pctBelowAvg");
  const [lotAbsPrice, setLotAbsPrice] = useState("");
  const [lotAbsDirection, setLotAbsDirection] = useState<Direction>("below");
  const [lotPctBelow, setLotPctBelow] = useState("10");
  const [lotPctAbove, setLotPctAbove] = useState("10");

  function buildPayload(): CreateAlertInput | null {
    setFormError(null);
    if (tradeId) {
      if (tradeAlertType === "PROFIT_TARGET") {
        const v = Number(profitPct);
        if (!Number.isFinite(v) || v < 1 || v > 99) {
          setFormError("Profit % must be between 1 and 99");
          return null;
        }
        return { type: "PROFIT_TARGET", tradeId, params: { profitPct: v } };
      }
      if (tradeAlertType === "ASSIGNMENT_RISK") {
        const a = Number(withinPctOfStrike);
        const b = Math.trunc(Number(assignmentMaxDte));
        if (!Number.isFinite(a) || a < 0 || a > 50) {
          setFormError("Within % of strike must be 0–50");
          return null;
        }
        if (!Number.isInteger(b) || b < 0 || b > 365) {
          setFormError("Max DTE must be 0–365");
          return null;
        }
        return {
          type: "ASSIGNMENT_RISK",
          tradeId,
          params: { withinPctOfStrike: a, maxDte: b },
        };
      }
      // ROLL_OPPORTUNITY
      const a = Math.trunc(Number(rollMaxDte));
      const b = Number(rollMinOtmPct);
      if (!Number.isInteger(a) || a < 0 || a > 60) {
        setFormError("Max DTE must be 0–60");
        return null;
      }
      if (!Number.isFinite(b) || b < 0 || b > 50) {
        setFormError("Min OTM % must be 0–50");
        return null;
      }
      return {
        type: "ROLL_OPPORTUNITY",
        tradeId,
        params: { maxDte: a, minOtmPct: b },
      };
    }
    if (ticker) {
      const p = Number(breachPrice);
      if (!Number.isFinite(p) || p <= 0) {
        setFormError("Trigger price must be positive");
        return null;
      }
      return {
        type: "WATCHLIST_BREACH",
        watchlistTicker: ticker.toUpperCase(),
        params: { triggerPrice: p, direction: breachDirection },
      };
    }
    if (stockLotId) {
      if (lotMode === "absolute") {
        const p = Number(lotAbsPrice);
        if (!Number.isFinite(p) || p <= 0) {
          setFormError("Trigger price must be positive");
          return null;
        }
        return {
          type: "LOT_PRICE_BREACH",
          stockLotId,
          params: { mode: "absolute", triggerPrice: p, direction: lotAbsDirection },
        };
      }
      if (lotMode === "pctBelowAvg") {
        const p = Number(lotPctBelow);
        if (!Number.isFinite(p) || p < 0.1 || p > 90) {
          setFormError("Percent must be 0.1–90");
          return null;
        }
        return {
          type: "LOT_PRICE_BREACH",
          stockLotId,
          params: { mode: "pctBelowAvg", pct: p },
        };
      }
      // pctAboveAvg
      const p = Number(lotPctAbove);
      if (!Number.isFinite(p) || p < 0.1 || p > 500) {
        setFormError("Percent must be 0.1–500");
        return null;
      }
      return {
        type: "LOT_PRICE_BREACH",
        stockLotId,
        params: { mode: "pctAboveAvg", pct: p },
      };
    }
    setFormError("Open this from a trade, lot, or watchlist row.");
    return null;
  }

  async function handleSubmit() {
    const payload = buildPayload();
    if (!payload) return;
    try {
      await create.mutateAsync(payload);
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    }
  }

  const loading = (tradeId && trade.isLoading) || (stockLotId && lot.isLoading);
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-950"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          {tradeId && trade.data ? (
            <>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-semibold text-white">
                    Alert on {trade.data.ticker}
                  </Text>
                  <TypeBadge type={trade.data.type} />
                </View>
                <Text className="text-xs text-slate-500 mt-1">
                  ${trade.data.strikePrice} strike · {trade.data.contractsOpen}{" "}
                  open
                </Text>
              </View>
              <Segmented<TradeAlertType>
                value={tradeAlertType}
                onChange={setTradeAlertType}
                options={[
                  { value: "PROFIT_TARGET", label: "Profit" },
                  { value: "ASSIGNMENT_RISK", label: "Assignment" },
                  { value: "ROLL_OPPORTUNITY", label: "Roll" },
                ]}
              />
              {tradeAlertType === "PROFIT_TARGET" ? (
                <FormField
                  label="Profit % to trigger at"
                  hint="Estimated profit on the open option premium"
                  value={profitPct}
                  onChangeText={setProfitPct}
                  keyboardType="decimal-pad"
                  placeholder="80"
                />
              ) : null}
              {tradeAlertType === "ASSIGNMENT_RISK" ? (
                <>
                  <FormField
                    label="Within % of strike"
                    value={withinPctOfStrike}
                    onChangeText={setWithinPctOfStrike}
                    keyboardType="decimal-pad"
                    placeholder="2"
                  />
                  <FormField
                    label="Only when DTE ≤"
                    value={assignmentMaxDte}
                    onChangeText={setAssignmentMaxDte}
                    keyboardType="number-pad"
                    placeholder="21"
                  />
                </>
              ) : null}
              {tradeAlertType === "ROLL_OPPORTUNITY" ? (
                <>
                  <FormField
                    label="When DTE ≤"
                    value={rollMaxDte}
                    onChangeText={setRollMaxDte}
                    keyboardType="number-pad"
                    placeholder="7"
                  />
                  <FormField
                    label="And OTM ≥ (%)"
                    value={rollMinOtmPct}
                    onChangeText={setRollMinOtmPct}
                    keyboardType="decimal-pad"
                    placeholder="2"
                  />
                </>
              ) : null}
            </>
          ) : null}

          {ticker ? (
            <>
              <View>
                <Text className="text-lg font-semibold text-white">
                  Watchlist alert for {ticker.toUpperCase()}
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Fires once when the price crosses the threshold.
                </Text>
              </View>
              <Segmented<Direction>
                value={breachDirection}
                onChange={setBreachDirection}
                options={[
                  { value: "above", label: "Rises to" },
                  { value: "below", label: "Drops to" },
                ]}
              />
              <FormField
                label="Trigger price"
                value={breachPrice}
                onChangeText={setBreachPrice}
                keyboardType="decimal-pad"
                placeholder="180.00"
              />
            </>
          ) : null}

          {stockLotId && lot.data ? (
            <>
              <View>
                <Text className="text-lg font-semibold text-white">
                  Lot alert for {lot.data.ticker}
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Avg cost ${lot.data.avgCost.toFixed(2)} ·{" "}
                  {lot.data.shares} shares
                </Text>
              </View>
              <Segmented<LotMode>
                value={lotMode}
                onChange={setLotMode}
                options={[
                  { value: "pctBelowAvg", label: "% below" },
                  { value: "pctAboveAvg", label: "% above" },
                  { value: "absolute", label: "Exact $" },
                ]}
              />
              {lotMode === "pctBelowAvg" ? (
                <FormField
                  label="Drops below avg by (%)"
                  hint={`Trigger at ~$${(
                    lot.data.avgCost *
                    (1 - Number(lotPctBelow) / 100)
                  ).toFixed(2)}`}
                  value={lotPctBelow}
                  onChangeText={setLotPctBelow}
                  keyboardType="decimal-pad"
                  placeholder="10"
                />
              ) : null}
              {lotMode === "pctAboveAvg" ? (
                <FormField
                  label="Rises above avg by (%)"
                  hint={`Trigger at ~$${(
                    lot.data.avgCost *
                    (1 + Number(lotPctAbove) / 100)
                  ).toFixed(2)}`}
                  value={lotPctAbove}
                  onChangeText={setLotPctAbove}
                  keyboardType="decimal-pad"
                  placeholder="10"
                />
              ) : null}
              {lotMode === "absolute" ? (
                <>
                  <Segmented<Direction>
                    value={lotAbsDirection}
                    onChange={setLotAbsDirection}
                    options={[
                      { value: "above", label: "Rises to" },
                      { value: "below", label: "Drops to" },
                    ]}
                  />
                  <FormField
                    label="Trigger price"
                    value={lotAbsPrice}
                    onChangeText={setLotAbsPrice}
                    keyboardType="decimal-pad"
                    placeholder={lot.data.avgCost.toFixed(2)}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {!tradeId && !ticker && !stockLotId ? (
            <View className="rounded-xl border border-rose-900 bg-rose-950/30 p-4">
              <Text className="text-rose-300">
                Open the alert form from a trade, stock lot, or watchlist row.
              </Text>
            </View>
          ) : null}

          {formError ? (
            <Text className="text-sm text-rose-400">{formError}</Text>
          ) : null}

          <SubmitBar
            label="Create alert"
            onPress={handleSubmit}
            loading={create.isPending}
            disabled={!tradeId && !ticker && !stockLotId}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
