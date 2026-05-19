// Wheel's own bottom tabs: Overview / Watchlist / Journal / Alerts.
// Lives inside the Wheel section so other apps (Books, Budget, etc.) get
// their own navigation when added — clean separation of in-app vs.
// inter-app nav.

import { Pressable } from "react-native";
import { Tabs, router } from "expo-router";
import {
  Bell,
  BookOpenText,
  Eye,
  LayoutDashboard,
  Menu,
  Plus,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useNavigation } from "expo-router";
import type { DrawerNavigationProp } from "@react-navigation/drawer";

export default function WheelTabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const nav = useNavigation();

  const headerBg = isDark ? "#0f172a" : "#ffffff";
  const headerText = isDark ? "#f8fafc" : "#0f172a";
  const tabBg = isDark ? "#0f172a" : "#ffffff";
  const tabBorder = isDark ? "#1e293b" : "#e2e8f0";
  const inactiveTint = isDark ? "#64748b" : "#94a3b8";

  // Both buttons live on every wheel tab's header — hamburger goes to
  // the drawer (app switcher), "+" opens new-trade modal.
  const headerLeft = () => (
    <Pressable
      onPress={() =>
        (nav as DrawerNavigationProp<Record<string, object | undefined>>)
          .getParent()
          ?.dispatch?.({ type: "OPEN_DRAWER" } as never)
      }
      className="ml-3 p-1.5 active:opacity-60"
      hitSlop={8}
    >
      <Menu color={headerText} size={22} />
    </Pressable>
  );
  const headerRight = () => (
    <Pressable
      onPress={() => router.push("/wheel/trade/new")}
      className="mr-3 p-1.5 active:opacity-60"
      hitSlop={8}
    >
      <Plus color="#10b981" size={22} />
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerText,
        headerShadowVisible: false,
        headerLeft,
        headerRight,
        tabBarActiveTintColor: "#10b981",
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: { backgroundColor: tabBg, borderTopColor: tabBorder },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Wheel Tracker",
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Watchlist",
          tabBarLabel: "Watch",
          tabBarIcon: ({ color, size }) => <Eye color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarLabel: "Journal",
          tabBarIcon: ({ color, size }) => (
            <BookOpenText color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarLabel: "Alerts",
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
