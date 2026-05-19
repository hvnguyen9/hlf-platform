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
import { useTrade } from "@/features/wheel/queries";
import { useCloseTrade } from "@/features/wheel/mutations";
import { Segmented } from "@/features/wheel/components/Segmented";
import { FormField } from "@/features/wheel/components/FormField";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";
import { tradeTypeLabel } from "@/features/wheel/format";

type Outcome = "expired" | "credit" | "assigned";

export default function CloseTradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trade = useTrade(id);
  const close = useCloseTrade();

  const [outcome, setOutcome] = useState<Outcome>("credit");
  const [closingPrice, setClosingPrice] = useState("");
  const [closingContracts, setClosingContracts] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (trade.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100 dark:bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (!trade.data) return null;
  const t = trade.data;
  const isAssignableType =
    t.type === "CashSecuredPut" || t.type === "CoveredCall";

  async function handleSubmit() {
    setFormError(null);
    const contractsOpen = t.contractsOpen;
    if (outcome === "expired") {
      try {
        await close.mutateAsync({
          tradeId: t.id,
          closingPrice: 0,
          closingContracts: contractsOpen,
          fullClose: true,
          closeReason: "expiredWorthless",
        });
        router.back();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Close failed");
      }
      return;
    }
    if (outcome === "assigned") {
      try {
        await close.mutateAsync({
          tradeId: t.id,
          closingPrice: 0,
          closingContracts: contractsOpen,
          fullClose: true,
          assignment: true,
          closeReason: "assigned",
        });
        router.back();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Close failed");
      }
      return;
    }
    // credit close
    const cp = Number(closingPrice);
    if (!Number.isFinite(cp) || cp < 0) {
      setFormError("Closing price must be 0 or greater");
      return;
    }
    const ctrRaw = closingContracts.trim()
      ? Math.trunc(Number(closingContracts))
      : contractsOpen;
    if (!Number.isInteger(ctrRaw) || ctrRaw <= 0 || ctrRaw > contractsOpen) {
      setFormError(`Contracts must be 1–${contractsOpen}`);
      return;
    }
    const isFull = ctrRaw === contractsOpen;
    try {
      await close.mutateAsync({
        tradeId: t.id,
        closingPrice: cp,
        closingContracts: ctrRaw,
        fullClose: isFull,
        closeReason: "manual",
      });
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Close failed");
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
              Close {t.ticker} {tradeTypeLabel(t.type)}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              ${t.strikePrice} strike · {t.contractsOpen} open
            </Text>
          </View>

          <View>
            <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Outcome
            </Text>
            <Segmented<Outcome>
              value={outcome}
              onChange={setOutcome}
              options={[
                { value: "credit", label: "Buy back" },
                { value: "expired", label: "Expired" },
                ...(isAssignableType
                  ? ([{ value: "assigned", label: "Assigned" }] as const)
                  : []),
              ]}
            />
          </View>

          {outcome === "credit" ? (
            <>
              <FormField
                label="Closing price"
                hint="Enter 0 if expired worthless or closed for a credit at zero"
                value={closingPrice}
                onChangeText={setClosingPrice}
                keyboardType="decimal-pad"
                placeholder="0.50"
              />
              <FormField
                label="Contracts to close"
                hint={`Leave blank to close all ${t.contractsOpen}`}
                value={closingContracts}
                onChangeText={setClosingContracts}
                keyboardType="number-pad"
                placeholder={String(t.contractsOpen)}
              />
            </>
          ) : null}

          {outcome === "expired" ? (
            <View className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <Text className="text-sm text-slate-700 dark:text-slate-300">
                Full {t.contractsOpen}-contract close at $0.00. You keep the
                full premium captured.
              </Text>
            </View>
          ) : null}

          {outcome === "assigned" ? (
            <View className="rounded-lg border border-amber-300 dark:border-amber-900/50 bg-amber-100 dark:bg-amber-950/30 p-3 gap-1">
              <Text className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t.type === "CashSecuredPut"
                  ? "Stock will be put to you"
                  : "Your shares will be called away"}
              </Text>
              <Text className="text-xs text-amber-700/80 dark:text-amber-200/80">
                {t.type === "CashSecuredPut"
                  ? "A stock lot will be created (or merged) at net basis (strike − premium)."
                  : "The linked stock lot will be closed; realized P/L = (strike − avgCost) × shares."}
              </Text>
            </View>
          ) : null}

          {formError ? (
            <Text className="text-sm text-rose-400">{formError}</Text>
          ) : null}

          <SubmitBar
            label="Close trade"
            variant={outcome === "assigned" ? "destructive" : "default"}
            onPress={handleSubmit}
            loading={close.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
