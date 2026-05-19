import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

type Props = {
  label: string;
  value: string | null;
  onChange: (yyyy_mm_dd: string) => void;
  error?: string;
};

function fmtDisplay(iso: string | null): string {
  if (!iso) return "Pick a date";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateField({ label, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);

  function handlePicker(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setOpen(false);
    if (selected) onChange(toYmd(selected));
  }

  const valueDate = value ? new Date(value + "T12:00:00") : new Date();

  return (
    <View>
      <Text className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 active:bg-slate-300 dark:active:bg-slate-800"
      >
        <Text className={value ? "text-slate-900 dark:text-white" : "text-slate-500"}>
          {fmtDisplay(value)}
        </Text>
      </Pressable>
      {error ? (
        <Text className="text-xs text-rose-400 mt-1">{error}</Text>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={valueDate}
          mode="date"
          display="default"
          onChange={handlePicker}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          transparent
          animationType="fade"
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            onPress={() => setOpen(false)}
            className="flex-1 justify-end bg-black/50"
          >
            <View className="bg-white dark:bg-slate-900 p-4">
              <DateTimePicker
                value={valueDate}
                mode="date"
                display="inline"
                themeVariant="dark"
                onChange={handlePicker}
              />
              <Pressable
                onPress={() => setOpen(false)}
                className="mt-2 rounded-lg bg-emerald-500 py-2"
              >
                <Text className="text-center font-medium text-slate-900 dark:text-white">Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
