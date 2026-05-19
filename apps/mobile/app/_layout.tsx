import "../global.css";

import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Toast, { BaseToast, type BaseToastProps } from "react-native-toast-message";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useAlertPoll } from "@/features/alerts/useAlertPoll";

function RootStack() {
  const { ready, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Background poll for alerts — only active while signed in.
  useAlertPoll();

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

// Themed toast that matches the rest of the dark UI.
const toastConfig = {
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#10b981",
        backgroundColor: "#0f172a",
        borderColor: "#1e293b",
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
      }}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      text1Style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}
      text2Style={{ color: "#cbd5e1", fontSize: 13 }}
    />
  ),
};

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
          <Toast config={toastConfig} />
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
