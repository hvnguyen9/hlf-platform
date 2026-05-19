import { Pressable, Text, View } from "react-native";

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 rounded-md py-2 ${
              active ? "bg-emerald-500/20" : "active:bg-slate-300 dark:active:bg-slate-800"
            }`}
          >
            <Text
              className={`text-center text-sm font-medium ${
                active ? "text-emerald-300" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
