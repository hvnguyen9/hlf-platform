import {
  ActivityIndicator,
  Pressable,
  Text,
  type ViewStyle,
} from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive";
  style?: ViewStyle;
};

export function SubmitBar({ label, onPress, loading, disabled, variant = "default" }: Props) {
  const bg =
    variant === "destructive" ? "bg-rose-500 active:bg-rose-600" : "bg-emerald-500 active:bg-emerald-600";
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      className={`rounded-lg py-3 ${bg} ${loading || disabled ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-center font-semibold text-slate-900 dark:text-white">{label}</Text>
      )}
    </Pressable>
  );
}
