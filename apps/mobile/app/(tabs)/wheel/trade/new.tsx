import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useOpenStockLots, usePortfolios } from "@/features/wheel/queries";
import { useCreateTrade, type CreateTradeInput } from "@/features/wheel/mutations";
import { Segmented } from "@/features/wheel/components/Segmented";
import { FormField } from "@/features/wheel/components/FormField";
import { DateField } from "@/features/wheel/components/DateField";
import { SubmitBar } from "@/features/wheel/components/SubmitBar";
import { money } from "@/features/wheel/format";

type TradeType = "CashSecuredPut" | "CoveredCall";

export default function NewTradeScreen() {
  const { portfolioId: preselectId } = useLocalSearchParams<{
    portfolioId?: string;
  }>();
  const portfolios = usePortfolios();
  const lots = useOpenStockLots();
  const create = useCreateTrade();

  const [type, setType] = useState<TradeType>("CashSecuredPut");
  const [portfolioId, setPortfolioId] = useState<string | null>(
    preselectId ?? null,
  );
  const [ticker, setTicker] = useState("");
  const [strikePrice, setStrikePrice] = useState("");
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [contracts, setContracts] = useState("");
  const [contractPrice, setContractPrice] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stockLotId, setStockLotId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const tickerUpper = ticker.trim().toUpperCase();

  // Auto-pick first portfolio when nothing is preselected and we have data
  if (!portfolioId && portfolios.data?.[0]) {
    setPortfolioId(portfolios.data[0].id);
  }

  const matchingLots = useMemo(() => {
    if (type !== "CoveredCall" || !tickerUpper) return [];
    return (
      lots.data?.filter(
        (lot) =>
          lot.ticker === tickerUpper &&
          lot.portfolioId === portfolioId &&
          lot.status === "OPEN",
      ) ?? []
    );
  }, [lots.data, tickerUpper, portfolioId, type]);

  function validate(): CreateTradeInput | null {
    setFormError(null);
    if (!portfolioId) return setFormError("Pick a portfolio"), null;
    if (!tickerUpper) return setFormError("Ticker is required"), null;
    const strike = Number(strikePrice);
    if (!Number.isFinite(strike) || strike <= 0)
      return setFormError("Strike must be a positive number"), null;
    if (!expirationDate)
      return setFormError("Expiration date is required"), null;
    const ctr = Math.trunc(Number(contracts));
    if (!Number.isInteger(ctr) || ctr <= 0)
      return setFormError("Contracts must be a positive integer"), null;
    const cp = Number(contractPrice);
    if (!Number.isFinite(cp) || cp <= 0)
      return setFormError("Contract price must be a positive number"), null;
    const ep = Number(entryPrice);
    if (!Number.isFinite(ep) || ep <= 0)
      return setFormError("Underlying entry price must be positive"), null;
    if (type === "CoveredCall") {
      if (!stockLotId)
        return setFormError("Link this CC to an open stock lot"), null;
      const lot = lots.data?.find((l) => l.id === stockLotId);
      if (!lot)
        return setFormError("Selected stock lot no longer available"), null;
      if (lot.shares < ctr * 100)
        return (
          setFormError(
            `Not enough shares: lot has ${lot.shares}, CC needs ${ctr * 100}`,
          ),
          null
        );
    }
    return {
      portfolioId,
      ticker: tickerUpper,
      type,
      strikePrice: strike,
      expirationDate,
      contracts: ctr,
      contractPrice: cp,
      entryPrice: ep,
      stockLotId: type === "CoveredCall" ? stockLotId! : undefined,
    };
  }

  async function handleSubmit() {
    const payload = validate();
    if (!payload) return;
    try {
      await create.mutateAsync(payload);
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Submit failed");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-100 dark:bg-slate-950"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <Segmented<TradeType>
            value={type}
            onChange={(v) => {
              setType(v);
              setStockLotId(null);
            }}
            options={[
              { value: "CashSecuredPut", label: "CSP" },
              { value: "CoveredCall", label: "CC" },
            ]}
          />

          <View>
            <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Portfolio
            </Text>
            <View className="gap-2">
              {portfolios.data?.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setPortfolioId(p.id)}
                  className={`rounded-lg border px-3 py-3 ${
                    portfolioId === p.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <Text className="text-sm text-slate-800 dark:text-slate-200">{p.name}</Text>
                </Pressable>
              ))}
              {portfolios.data?.length === 0 ? (
                <Text className="text-xs text-slate-500">
                  No portfolios yet. Create one in the web app first.
                </Text>
              ) : null}
            </View>
          </View>

          <FormField
            label="Ticker"
            value={ticker}
            onChangeText={setTicker}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="AAPL"
          />

          <FormField
            label="Strike price"
            value={strikePrice}
            onChangeText={setStrikePrice}
            keyboardType="decimal-pad"
            placeholder="250"
          />

          <DateField
            label="Expiration"
            value={expirationDate}
            onChange={setExpirationDate}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField
                label="Contracts"
                value={contracts}
                onChangeText={setContracts}
                keyboardType="number-pad"
                placeholder="1"
              />
            </View>
            <View className="flex-1">
              <FormField
                label="Contract price"
                value={contractPrice}
                onChangeText={setContractPrice}
                keyboardType="decimal-pad"
                placeholder="4.20"
              />
            </View>
          </View>

          <FormField
            label="Underlying entry"
            hint="Current underlying price for capital tracking"
            value={entryPrice}
            onChangeText={setEntryPrice}
            keyboardType="decimal-pad"
            placeholder="245.10"
          />

          {type === "CoveredCall" ? (
            <View>
              <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Linked stock lot
              </Text>
              {matchingLots.length === 0 ? (
                <View className="rounded-lg border border-amber-300 dark:border-amber-900/50 bg-amber-100 dark:bg-amber-950/30 p-3">
                  <Text className="text-xs text-amber-700 dark:text-amber-300">
                    {tickerUpper
                      ? `No open ${tickerUpper} lots in this portfolio.`
                      : "Enter a ticker to see available lots."}
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {matchingLots.map((lot) => (
                    <Pressable
                      key={lot.id}
                      onPress={() => setStockLotId(lot.id)}
                      className={`rounded-lg border px-3 py-3 ${
                        stockLotId === lot.id
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-slate-800 dark:text-slate-200">
                          {lot.shares} sh @ ${lot.avgCost.toFixed(2)}
                        </Text>
                        <Text className="text-xs text-slate-500">
                          basis {money(lot.shares * lot.avgCost)}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {formError ? (
            <Text className="text-sm text-rose-400">{formError}</Text>
          ) : null}

          <SubmitBar
            label="Create trade"
            onPress={handleSubmit}
            loading={create.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
