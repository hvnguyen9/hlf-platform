import { Tabs } from "expo-router";
import { BookOpen, Home, TrendingUp, User, Wallet } from "lucide-react-native";
import { useColorScheme } from "nativewind";

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const headerBg = isDark ? "#0f172a" : "#ffffff";
  const headerText = isDark ? "#f8fafc" : "#0f172a";
  const tabBg = isDark ? "#0f172a" : "#ffffff";
  const tabBorder = isDark ? "#1e293b" : "#e2e8f0";
  const inactiveTint = isDark ? "#64748b" : "#94a3b8";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#10b981",
        tabBarInactiveTintColor: inactiveTint,
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerText,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopColor: tabBorder,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wheel"
        options={{
          headerShown: false,
          tabBarLabel: "Wheel",
          tabBarIcon: ({ color, size }) => (
            <TrendingUp color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: "Bookkeeping",
          tabBarLabel: "Books",
          tabBarIcon: ({ color, size }) => (
            <BookOpen color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget Tracker",
          tabBarLabel: "Budget",
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Profile",
          tabBarLabel: "Me",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
