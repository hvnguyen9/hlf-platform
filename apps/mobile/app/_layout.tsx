import "../global.css";

import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function RootStack() {
  const { ready, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!token && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (token && inAuthGroup) {
      router.replace("/");
    }
  }, [ready, token, segments, router]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)/sign-in" />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootStack />
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
