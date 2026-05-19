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
import { useTrade } from "@/features/wheel/queries";
import { useAddContracts } from "@/features/wheel/mutations";
import { FormField } from "@/features/wheel/components/FormField";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";
import { tradeTypeLabel } from "@/features/wheel/format";

export default function AddContractsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trade = useTrade(id);
  const addContracts = useAddContracts();

  const [addedContracts, setAddedContracts] = useState("");
  const [addedContractPrice, setAddedContractPrice] = useState("");
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

  function handleSubmit() {
    setFormError(null);
    const ctr = Math.trunc(Number(addedContracts));
    if (!Number.isInteger(ctr) || ctr <= 0) {
      setFormError("Contracts must be a positive integer");
      return;
    }
    const price = Number(addedContractPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Contract price must be positive");
      return;
    }
    // Fire-and-forget: dismiss immediately so the user gets back to the
    // trade detail without staring at a spinner. If the server rejects,
    // surface that via a native Alert.
    addContracts.mutate(
      { tradeId: t.id, addedContracts: ctr, addedContractPrice: price },
      {
        onError: (err) =>
          Alert.alert(
            "Couldn't add contracts",
            err instanceof Error ? err.message : "Try again later.",
          ),
      },
    );
    router.back();
  }

  const newTotalContracts = t.contractsOpen + Math.trunc(Number(addedContracts) || 0);
  const newAvgPrice =
    addedContracts && addedContractPrice
      ? (t.contractPrice * t.contractsOpen +
          Number(addedContractPrice) * Math.trunc(Number(addedContracts))) /
        (t.contractsOpen + Math.trunc(Number(addedContracts)))
      : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-100 dark:bg-slate-950"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <View>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">
              Add to {t.ticker} {tradeTypeLabel(t.type)}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              ${t.strikePrice} strike · {t.contractsOpen} open @ $
              {t.contractPrice.toFixed(2)}
            </Text>
          </View>

          <FormField
            label="Added contracts"
            value={addedContracts}
            onChangeText={setAddedContracts}
            keyboardType="number-pad"
            placeholder="1"
          />
          <FormField
            label="Price paid"
            hint="Premium per contract for the added contracts"
            value={addedContractPrice}
            onChangeText={setAddedContractPrice}
            keyboardType="decimal-pad"
            placeholder="4.20"
          />

          {newAvgPrice != null ? (
            <View className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 gap-1">
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">New total</Text>
                <Text className="text-sm text-slate-800 dark:text-slate-200">
                  {newTotalContracts} contracts
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">New avg price</Text>
                <Text className="text-sm text-slate-800 dark:text-slate-200">
                  ${newAvgPrice.toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}

          {formError ? (
            <Text className="text-sm text-rose-400">{formError}</Text>
          ) : null}

          <SubmitBar
            label="Add contracts"
            onPress={handleSubmit}
            loading={addContracts.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
