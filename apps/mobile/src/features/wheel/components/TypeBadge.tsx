// Matches the web wheel-tracker's TypeBadge color palette:
// CSP → blue, CC → violet, Put → amber, Call → emerald.

import { Text, View } from "react-native";

export function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase().replace(/[\s_-]/g, "");
  const isCSP = t === "cashsecuredput" || t === "csp";
  const isCC = t === "coveredcall" || t === "cc";
  const isPut = t === "put";
  const isCall = t === "call";

  const cls = isCSP
    ? "bg-blue-900/40 border-blue-900/60"
    : isCC
      ? "bg-violet-900/40 border-violet-900/60"
      : isPut
        ? "bg-amber-900/40 border-amber-900/60"
        : isCall
          ? "bg-emerald-900/40 border-emerald-900/60"
          : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700";

  const textCls = isCSP
    ? "text-blue-300"
    : isCC
      ? "text-violet-300"
      : isPut
        ? "text-amber-300"
        : isCall
          ? "text-emerald-300"
          : "text-slate-600 dark:text-slate-400";

  const label = isCSP
    ? "CSP"
    : isCC
      ? "CC"
      : isPut
        ? "Put"
        : isCall
          ? "Call"
          : type;

  return (
    <View className={`self-start rounded border px-1.5 py-0.5 ${cls}`}>
      <Text className={`text-[10px] font-bold tracking-wider ${textCls}`}>
        {label}
      </Text>
    </View>
  );
}
