import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";

export default function MeScreen() {
  const { user, signOut } = useAuth();

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
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4">
        <Text className="text-2xl font-bold text-white">Profile</Text>

        {user ? (
          <View className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <Text className="text-xs uppercase tracking-wide text-slate-500">
              Signed in as
            </Text>
            <Text className="text-lg font-semibold text-white mt-1">
              {user.firstName} {user.lastName}
            </Text>
            <Text className="text-sm text-slate-400 mt-1">{user.email}</Text>
            <Text className="text-xs text-slate-500 mt-2">@{user.username}</Text>
            {user.isAdmin ? (
              <View className="mt-3 self-start rounded-full bg-amber-500/20 px-2 py-1">
                <Text className="text-xs font-medium text-amber-300">Admin</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={handleSignOut}
          className="mt-6 rounded-lg border border-rose-700/50 bg-rose-900/20 px-4 py-3 active:bg-rose-900/40"
        >
          <Text className="text-center font-medium text-rose-300">Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
