import "../global.css";

import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useColorScheme } from "nativewind";
import Toast, { BaseToast, type BaseToastProps } from "react-native-toast-message";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useAlertPoll } from "@/features/alerts/useAlertPoll";
import { ThemeBoot } from "@/lib/theme";

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
      <View className="flex-1 items-center justify-center bg-slate-100 dark:bg-slate-950">
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

// Toast that picks colors based on the current color scheme so it reads
// well on both light and dark backgrounds.
function useToastConfig() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return {
    info: (props: BaseToastProps) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: "#10b981",
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderColor: isDark ? "#1e293b" : "#e2e8f0",
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
        }}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        text1Style={{
          color: isDark ? "#f8fafc" : "#0f172a",
          fontSize: 14,
          fontWeight: "600",
        }}
        text2Style={{
          color: isDark ? "#cbd5e1" : "#475569",
          fontSize: 13,
        }}
      />
    ),
  };
}

function ThemedToast() {
  const config = useToastConfig();
  return <Toast config={config} />;
}

function ThemedStatusBar() {
  const { colorScheme } = useColorScheme();
  return <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />;
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
      <ThemeBoot />
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemedStatusBar />
          <RootStack />
          <ThemedToast />
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
