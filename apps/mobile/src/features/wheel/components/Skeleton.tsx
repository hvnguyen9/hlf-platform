// Pulsing placeholder for loading states. Uses Reanimated for the shimmer
// because withRepeat keeps the animation on the UI thread — no JS bridge
// hops, so it stays smooth while other queries are still resolving.

import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export function Skeleton({ className = "" }: { className?: string }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      className={`rounded-lg bg-slate-800 ${className}`}
      style={animatedStyle}
    />
  );
}

export function KpiSkeleton() {
  return (
    <Animated.View className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-3 gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-16" />
    </Animated.View>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  const rows = Math.ceil(count / 2);
  return (
    <Animated.View className="gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} className="flex-row gap-3">
          <KpiSkeleton />
          <KpiSkeleton />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export function RowSkeleton() {
  return (
    <Animated.View className="rounded-xl border border-slate-800 bg-slate-900 p-3 gap-2">
      <Animated.View className="flex-row items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </Animated.View>
      <Skeleton className="h-3 w-3/4" />
    </Animated.View>
  );
}

export function RowSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <Animated.View className="gap-2">
      {Array.from({ length: count }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </Animated.View>
  );
}
