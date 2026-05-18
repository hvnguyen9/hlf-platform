import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTrade } from "@/features/wheel/queries";
import { useEditTrade } from "@/features/wheel/mutations";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";

type TradeWithNotes = { notes?: string | null };

export default function TradeNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trade = useTrade(id);
  const edit = useEditTrade();
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const tradeNotes = (trade.data as TradeWithNotes | undefined)?.notes ?? "";

  useEffect(() => {
    if (trade.data) setNotes(tradeNotes);
  }, [trade.data, tradeNotes]);

  if (trade.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (!trade.data) return null;

  async function handleSubmit() {
    setFormError(null);
    try {
      await edit.mutateAsync({ tradeId: trade.data!.id, notes });
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-950"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <Text className="text-lg font-semibold text-white">
            Notes for {trade.data.ticker}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            placeholder="Anything to remember about this trade…"
            placeholderTextColor="#475569"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white min-h-[200px]"
          />
          {formError ? (
            <Text className="text-sm text-rose-400">{formError}</Text>
          ) : null}
          <SubmitBar
            label="Save notes"
            onPress={handleSubmit}
            loading={edit.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
