import { Pressable, ScrollView, Text } from "react-native";
import { usePortfolios } from "../queries";

type Props = {
  value: string | null;
  onChange: (portfolioId: string | null) => void;
};

export function PortfolioFilter({ value, onChange }: Props) {
  const portfolios = usePortfolios();
  if (!portfolios.data || portfolios.data.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}
      className="flex-grow-0"
    >
      <Chip label="All" active={value === null} onPress={() => onChange(null)} />
      {portfolios.data.map((p) => (
        <Chip
          key={p.id}
          label={p.name}
          active={value === p.id}
          onPress={() => onChange(p.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        active
          ? "border-emerald-500 bg-emerald-500/20"
          : "border-slate-700 bg-slate-900 active:bg-slate-800"
      }`}
    >
      <Text
        className={`text-xs font-medium ${
          active ? "text-emerald-300" : "text-slate-300"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
