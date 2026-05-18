import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

export default function MeScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4">
        <Text className="text-2xl font-bold text-white">Profile</Text>
        <Text className="text-slate-400 mt-1">
          Edit profile, change password, admin (if applicable).
        </Text>

        <Pressable
          onPress={() => router.push("/(auth)/sign-in")}
          className="mt-6 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 active:bg-slate-800"
        >
          <Text className="text-center font-medium text-slate-200">
            Open sign-in (preview)
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
