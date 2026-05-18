import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

export default function SignInScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  function handleSignIn() {
    router.replace("/");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-950"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-white">HLF</Text>
          <Text className="text-slate-400 mt-1">Sign in to continue</Text>
        </View>

        <Text className="text-sm font-medium text-slate-300 mb-2">
          Username or email
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="hung or you@example.com"
          placeholderTextColor="#475569"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white"
        />

        <Text className="text-sm font-medium text-slate-300 mt-4 mb-2">
          Password
        </Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#475569"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white"
        />

        <Pressable
          onPress={handleSignIn}
          className="mt-6 rounded-lg bg-emerald-500 py-3 active:bg-emerald-600"
        >
          <Text className="text-center font-semibold text-white">Sign in</Text>
        </Pressable>

        <Text className="text-xs text-slate-500 text-center mt-4">
          Stub UI — real auth wires up in the next chunk.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
