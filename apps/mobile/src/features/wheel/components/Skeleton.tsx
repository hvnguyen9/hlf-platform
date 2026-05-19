// Pulsing placeholder for loading states. Uses RN's built-in Animated API
// (not Reanimated) so it runs cleanly in Expo Go — Reanimated 4 needs a
// custom dev build for its worklets TurboModule, and the shimmer here is
// simple enough that useNativeDriver:true on opacity gives the same
// UI-thread perf.

import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export function Skeleton({ className = "" }: { className?: string }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      className={`rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
      style={{ opacity }}
    />
  );
}

export function KpiSkeleton() {
  return (
    <View className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-16" />
    </View>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  const rows = Math.ceil(count / 2);
  return (
    <View className="gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className="flex-row gap-3">
          <KpiSkeleton />
          <KpiSkeleton />
        </View>
      ))}
    </View>
  );
}

export function RowSkeleton() {
  return (
    <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 gap-2">
      <View className="flex-row items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </View>
      <Skeleton className="h-3 w-3/4" />
    </View>
  );
}

export function RowSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-2">
      {Array.from({ length: count }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

export function DetailHeaderSkeleton() {
  return (
    <View className="gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-4 w-28" />
    </View>
  );
}

export function CardGroupSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className="flex-row items-center justify-between py-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </View>
      ))}
    </View>
  );
}
