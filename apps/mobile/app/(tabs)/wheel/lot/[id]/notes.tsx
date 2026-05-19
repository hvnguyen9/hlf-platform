import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useStockLot } from "@/features/wheel/queries";
import { useEditLot } from "@/features/wheel/mutations";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";

export default function LotNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lot = useStockLot(id);
  const edit = useEditLot();
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const lotNotes = lot.data?.notes ?? "";
  useEffect(() => {
    if (lot.data) setNotes(lotNotes);
  }, [lot.data, lotNotes]);

  if (lot.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100 dark:bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (!lot.data) return null;

  function handleSubmit() {
    setFormError(null);
    edit.mutate(
      { stockLotId: lot.data!.id, notes },
      {
        onError: (err) =>
          Alert.alert(
            "Couldn't save notes",
            err instanceof Error ? err.message : "Try again later.",
          ),
      },
    );
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-100 dark:bg-slate-950"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">
            Notes for {lot.data.ticker}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            placeholder="Anything to remember about this lot…"
            placeholderTextColor="#475569"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-slate-900 dark:text-white min-h-[200px]"
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
