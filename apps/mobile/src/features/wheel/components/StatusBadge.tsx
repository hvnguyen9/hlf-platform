import { Text, View } from "react-native";

type Props = {
  status: "open" | "closed" | "OPEN" | "CLOSED";
  reason?: string | null;
};

export function StatusBadge({ status, reason }: Props) {
  const isOpen = status === "open" || status === "OPEN";
  const label = isOpen ? "open" : reason ?? "closed";
  const className = isOpen
    ? "bg-emerald-500/20 text-emerald-300"
    : reason === "assigned"
      ? "bg-amber-500/20 text-amber-300"
      : "bg-slate-700/40 text-slate-600 dark:text-slate-400";
  return (
    <View className="self-start rounded-full px-2 py-0.5">
      <Text className={`text-[10px] font-medium uppercase tracking-wider ${className}`}>
        {label}
      </Text>
    </View>
  );
}
