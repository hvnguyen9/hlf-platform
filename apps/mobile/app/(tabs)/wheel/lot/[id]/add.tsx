import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useStockLot } from "@/features/wheel/queries";
import { useAddShares } from "@/features/wheel/mutations";
import { FormField } from "@/features/wheel/components/FormField";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";
import { money } from "@/features/wheel/format";

export default function AddSharesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lot = useStockLot(id);
  const addShares = useAddShares();

  const [addedShares, setAddedShares] = useState("");
  const [costPerShare, setCostPerShare] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (lot.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (!lot.data) return null;
  const data = lot.data;

  function handleSubmit() {
    setFormError(null);
    const shares = Math.trunc(Number(addedShares));
    if (!Number.isInteger(shares) || shares <= 0) {
      setFormError("Shares must be a positive integer");
      return;
    }
    const cost = Number(costPerShare);
    if (!Number.isFinite(cost) || cost <= 0) {
      setFormError("Cost per share must be positive");
      return;
    }
    addShares.mutate(
      {
        stockLotId: data.id,
        addedShares: shares,
        costPerShare: cost,
        note: note.trim() || undefined,
      },
      {
        onError: (err) =>
          Alert.alert(
            "Couldn't add shares",
            err instanceof Error ? err.message : "Try again later.",
          ),
      },
    );
    router.back();
  }

  const newTotal = data.shares + Math.trunc(Number(addedShares) || 0);
  const newAvg =
    addedShares && costPerShare && newTotal > 0
      ? (data.avgCost * data.shares +
          Number(costPerShare) * Math.trunc(Number(addedShares))) /
        newTotal
      : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-950"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <View>
            <Text className="text-lg font-semibold text-white">
              Add to {data.ticker}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              {data.shares} shares · avg ${data.avgCost.toFixed(2)} · basis{" "}
              {money(data.shares * data.avgCost)}
            </Text>
          </View>

          <FormField
            label="Added shares"
            value={addedShares}
            onChangeText={setAddedShares}
            keyboardType="number-pad"
            placeholder="100"
          />
          <FormField
            label="Cost per share"
            value={costPerShare}
            onChangeText={setCostPerShare}
            keyboardType="decimal-pad"
            placeholder="180.50"
          />
          <FormField
            label="Note (optional)"
            hint="Appended to the lot's notes log"
            value={note}
            onChangeText={setNote}
            placeholder="Averaged down after earnings"
          />

          {newAvg != null ? (
            <View className="rounded-lg border border-slate-800 bg-slate-900 p-3 gap-1">
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">New total</Text>
                <Text className="text-sm text-slate-200">{newTotal} shares</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">New avg cost</Text>
                <Text className="text-sm text-slate-200">${newAvg.toFixed(2)}</Text>
              </View>
            </View>
          ) : null}

          {formError ? (
            <Text className="text-sm text-rose-400">{formError}</Text>
          ) : null}

          <SubmitBar
            label="Add shares"
            onPress={handleSubmit}
            loading={addShares.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
