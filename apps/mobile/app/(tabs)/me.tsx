import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";

export default function MeScreen() {
  const { user, signOut } = useAuth();
  const { scheme, setMode } = useTheme();

  function handleSignOut() {
    Alert.alert("Sign out?", "You'll need to enter your password again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-slate-100 dark:bg-slate-950">
      <View className="p-4 gap-6">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          Profile
        </Text>

        {user ? (
          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <Text className="text-xs uppercase tracking-wide text-slate-500">
              Signed in as
            </Text>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {user.firstName} {user.lastName}
            </Text>
            <Text className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {user.email}
            </Text>
            <Text className="text-xs text-slate-500 mt-2">@{user.username}</Text>
            {user.isAdmin ? (
              <View className="mt-3 self-start rounded-full bg-amber-500/20 px-2 py-1">
                <Text className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Admin
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View>
          <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Appearance
          </Text>
          <View className="flex-row rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
            <ThemeButton
              label="Light"
              active={scheme === "light"}
              onPress={() => setMode("light")}
            />
            <ThemeButton
              label="Dark"
              active={scheme === "dark"}
              onPress={() => setMode("dark")}
            />
            <ThemeButton
              label="System"
              active={false}
              onPress={() => setMode("system")}
            />
          </View>
          <Text className="text-[10px] text-slate-500 mt-1">
            "System" follows your phone's setting.
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          className="rounded-lg border border-rose-300 dark:border-rose-700/50 bg-rose-100 dark:bg-rose-900/20 px-4 py-3 active:bg-rose-200 dark:active:bg-rose-900/40"
        >
          <Text className="text-center font-medium text-rose-700 dark:text-rose-300">
            Sign out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ThemeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-md py-2 ${
        active
          ? "bg-emerald-500/20"
          : "active:bg-slate-100 dark:active:bg-slate-800/60"
      }`}
    >
      <Text
        className={`text-center text-sm font-medium ${
          active
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
