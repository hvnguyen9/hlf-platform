import { Text, View } from "react-native";

export type KpiItem = {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
};

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((kpi, i) => (
        <View
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
          style={{ width: "48%" }}
        >
          <Text className="text-[10px] uppercase tracking-wide text-slate-500">
            {kpi.label}
          </Text>
          <Text className={`text-lg font-semibold mt-1 ${kpi.valueClass ?? "text-slate-900 dark:text-white"}`}>
            {kpi.value}
          </Text>
          {kpi.sub ? (
            <Text className="text-[10px] text-slate-500 mt-1">{kpi.sub}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
