import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAlertConfigs,
  useAlertEvents,
  useDeleteAlert,
  useToggleAlert,
} from "@/features/alerts/queries";
import { describeConfig, TYPE_LABEL } from "@/features/alerts/types";
import type { AlertConfig, AlertEvent } from "@/features/alerts/types";
import { EmptyState } from "@/features/wheel/components/EmptyState";
import { QueryError } from "@/features/wheel/components/QueryError";
import { tradeTypeLabel } from "@/features/wheel/format";

function describeBinding(c: AlertConfig): string {
  if (c.trade) {
    return `${c.trade.ticker} ${tradeTypeLabel(c.trade.type)} $${c.trade.strikePrice}`;
  }
  if (c.watchlistTicker) {
    return c.watchlistTicker;
  }
  if (c.stockLot) {
    return `${c.stockLot.ticker} (${c.stockLot.shares} sh)`;
  }
  return "—";
}

function ConfigRow({ config }: { config: AlertConfig }) {
  const toggle = useToggleAlert();
  const remove = useDeleteAlert();

  function handleDelete() {
    Alert.alert(
      "Delete alert?",
      "It will stop firing and be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void remove.mutate(config.id);
          },
        },
      ],
    );
  }

  function handleTap() {
    if (config.tradeId) router.push(`/wheel/trade/${config.tradeId}`);
    else if (config.stockLotId) router.push(`/wheel/lot/${config.stockLotId}`);
    else if (config.watchlistTicker) router.push("/wheel/watchlist");
  }

  return (
    <View
      className={`rounded-xl border border-slate-800 bg-slate-900 p-3 ${
        config.enabled ? "" : "opacity-60"
      }`}
    >
      <Pressable onPress={handleTap} className="active:opacity-80">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-white">
                {describeBinding(config)}
              </Text>
              <Text className="text-[10px] uppercase tracking-wider text-slate-500">
                {TYPE_LABEL[config.type]}
              </Text>
            </View>
            <Text className="text-xs text-slate-400 mt-1">
              {describeConfig(config)}
            </Text>
            {config.lastFiredAt ? (
              <Text className="text-[10px] text-slate-500 mt-1">
                last fired{" "}
                {new Date(config.lastFiredAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            ) : null}
          </View>
          <View className="items-end gap-2">
            <Switch
              value={config.enabled}
              onValueChange={(enabled) =>
                toggle.mutate({ id: config.id, enabled })
              }
              trackColor={{ false: "#1e293b", true: "#10b981" }}
              thumbColor="#f8fafc"
            />
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={handleDelete}
        className="mt-2 self-end p-1 active:opacity-60"
        hitSlop={8}
      >
        <Trash2 color="#64748b" size={16} />
      </Pressable>
    </View>
  );
}

function EventRow({ event }: { event: AlertEvent }) {
  const when = new Date(event.firedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  function handleTap() {
    if (event.config.tradeId) router.push(`/wheel/trade/${event.config.tradeId}`);
    else if (event.config.watchlistTicker) router.push("/wheel/watchlist");
  }
  return (
    <Pressable
      onPress={handleTap}
      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 active:bg-slate-800/60"
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[10px] uppercase tracking-wider text-amber-300">
          {TYPE_LABEL[event.config.type]}
        </Text>
        <Text className="text-[10px] text-slate-500">{when}</Text>
      </View>
      <Text className="text-sm text-slate-200 mt-1">{event.message}</Text>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const configs = useAlertConfigs({ includeTrade: true });
  const events = useAlertEvents(50);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["alerts"] });
    setRefreshing(false);
  }

  const activeCount = configs.data?.filter((c) => c.enabled).length ?? 0;
  const totalCount = configs.data?.length ?? 0;

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#10b981"
        />
      }
    >
      <View className="p-4 gap-4">
        <View>
          <Text className="text-2xl font-bold text-white">Alerts</Text>
          <Text className="text-slate-400 mt-1">
            {activeCount} active of {totalCount} configured ·{" "}
            {events.data?.length ?? 0} recent fires
          </Text>
        </View>

        <View>
          <Text className="text-sm font-semibold text-slate-300 mb-2">
            Active triggers
          </Text>
          {configs.isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#10b981" />
            </View>
          ) : configs.error ? (
            <QueryError error={configs.error} />
          ) : !configs.data || configs.data.length === 0 ? (
            <EmptyState message="No alert configs yet. Add one from a trade, stock lot, or watchlist row." />
          ) : (
            <View className="gap-2">
              {configs.data.map((c) => (
                <ConfigRow key={c.id} config={c} />
              ))}
            </View>
          )}
        </View>

        <View>
          <Text className="text-sm font-semibold text-slate-300 mb-2">
            Recent fires
          </Text>
          {events.isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#10b981" />
            </View>
          ) : events.error ? (
            <QueryError error={events.error} />
          ) : !events.data || events.data.length === 0 ? (
            <EmptyState message="No alerts have fired yet." />
          ) : (
            <View className="gap-2">
              {events.data.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
