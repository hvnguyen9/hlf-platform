import { TextInput, type TextInputProps, Text, View } from "react-native";

type Props = {
  label: string;
  hint?: string;
  error?: string;
} & TextInputProps;

export function FormField({ label, hint, error, ...inputProps }: Props) {
  return (
    <View>
      <Text className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#475569"
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white"
      />
      {error ? (
        <Text className="text-xs text-rose-400 mt-1">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-slate-500 mt-1">{hint}</Text>
      ) : null}
    </View>
  );
}
