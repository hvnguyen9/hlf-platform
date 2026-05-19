import { Drawer } from "expo-router/drawer";
import { useColorScheme } from "nativewind";
import { Text, View } from "react-native";
import {
  BookOpen,
  Home,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react-native";
import {
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";

// Custom drawer so we can group items into sections ("Apps", "Account")
// with header labels between, rather than the default flat list.
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const activeTint = "#10b981";
  const inactiveTint = isDark ? "#cbd5e1" : "#475569";
  const sectionLabelColor = isDark ? "#64748b" : "#94a3b8";

  const routeNames = props.state.routeNames;
  const currentRoute = routeNames[props.state.index];

  const labelStyle = { fontSize: 15, fontWeight: "500" as const };

  function go(route: string) {
    props.navigation.navigate(route);
  }

  function SectionHeader({ label }: { label: string }) {
    return (
      <View className="mt-3 mb-1 px-5">
        <Text
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: sectionLabelColor }}
        >
          {label}
        </Text>
      </View>
    );
  }

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem
        label="Home"
        focused={currentRoute === "index"}
        onPress={() => go("index")}
        icon={({ color, size }) => <Home color={color} size={size} />}
        activeTintColor={activeTint}
        inactiveTintColor={inactiveTint}
        labelStyle={labelStyle}
      />

      <SectionHeader label="Apps" />
      <DrawerItem
        label="Wheel"
        focused={currentRoute === "wheel"}
        onPress={() => go("wheel")}
        icon={({ color, size }) => <TrendingUp color={color} size={size} />}
        activeTintColor={activeTint}
        inactiveTintColor={inactiveTint}
        labelStyle={labelStyle}
      />
      <DrawerItem
        label="Bookkeeping"
        focused={currentRoute === "books"}
        onPress={() => go("books")}
        icon={({ color, size }) => <BookOpen color={color} size={size} />}
        activeTintColor={activeTint}
        inactiveTintColor={inactiveTint}
        labelStyle={labelStyle}
      />
      <DrawerItem
        label="Budgeting"
        focused={currentRoute === "budget"}
        onPress={() => go("budget")}
        icon={({ color, size }) => <Wallet color={color} size={size} />}
        activeTintColor={activeTint}
        inactiveTintColor={inactiveTint}
        labelStyle={labelStyle}
      />

      <SectionHeader label="Account" />
      <DrawerItem
        label="Profile"
        focused={currentRoute === "me"}
        onPress={() => go("me")}
        icon={({ color, size }) => <User color={color} size={size} />}
        activeTintColor={activeTint}
        inactiveTintColor={inactiveTint}
        labelStyle={labelStyle}
      />
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const headerBg = isDark ? "#0f172a" : "#ffffff";
  const headerText = isDark ? "#f8fafc" : "#0f172a";
  const drawerBg = isDark ? "#0f172a" : "#ffffff";

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerText,
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: drawerBg },
      }}
    >
      {/* Headers + titles defined per-route — drawerLabel is unused now
         since the custom drawer content renders labels directly. */}
      <Drawer.Screen name="wheel" options={{ headerShown: false }} />
      <Drawer.Screen name="index" options={{ title: "Home" }} />
      <Drawer.Screen name="books" options={{ title: "Bookkeeping" }} />
      <Drawer.Screen name="budget" options={{ title: "Budgeting" }} />
      <Drawer.Screen name="me" options={{ title: "Profile" }} />
    </Drawer>
  );
}
