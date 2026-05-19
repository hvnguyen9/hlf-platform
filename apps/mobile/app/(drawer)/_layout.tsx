import { Drawer } from "expo-router/drawer";
import { useColorScheme } from "nativewind";
import {
  BookOpen,
  Home,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react-native";

export default function DrawerLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const headerBg = isDark ? "#0f172a" : "#ffffff";
  const headerText = isDark ? "#f8fafc" : "#0f172a";
  const drawerBg = isDark ? "#0f172a" : "#ffffff";
  const inactiveTint = isDark ? "#cbd5e1" : "#475569";

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerText,
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: drawerBg },
        drawerActiveTintColor: "#10b981",
        drawerInactiveTintColor: inactiveTint,
        drawerLabelStyle: { marginLeft: -16, fontSize: 15 },
      }}
    >
      <Drawer.Screen
        name="wheel"
        options={{
          title: "Wheel Tracker",
          drawerLabel: "Wheel Tracker",
          drawerIcon: ({ color, size }) => (
            <TrendingUp color={color} size={size} />
          ),
          // Wheel owns its own nested header (Stack inside Tabs), hide
          // the drawer-level header so we don't render two.
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="index"
        options={{
          title: "Today",
          drawerLabel: "Today",
          drawerIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="books"
        options={{
          title: "Bookkeeping",
          drawerLabel: "Bookkeeping",
          drawerIcon: ({ color, size }) => (
            <BookOpen color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="budget"
        options={{
          title: "Budget Tracker",
          drawerLabel: "Budget Tracker",
          drawerIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="me"
        options={{
          title: "Profile",
          drawerLabel: "Profile",
          drawerIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Drawer>
  );
}
