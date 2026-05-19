import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth-context";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    if (submitting) return;
    if (!identifier.trim() || !password) {
      setError("Enter your username/email and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-100 dark:bg-slate-950"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-slate-900 dark:text-white">HLF</Text>
          <Text className="text-slate-600 dark:text-slate-400 mt-1">Sign in to continue</Text>
        </View>

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Username or email
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="hung or you@example.com"
          placeholderTextColor="#475569"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-slate-900 dark:text-white"
          editable={!submitting}
        />

        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-4 mb-2">
          Password
        </Text>
        <TextInput
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#475569"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-slate-900 dark:text-white"
          editable={!submitting}
          onSubmitEditing={handleSignIn}
        />

        {error ? (
          <Text className="text-sm text-rose-400 mt-3">{error}</Text>
        ) : null}

        <Pressable
          onPress={handleSignIn}
          disabled={submitting}
          className="mt-6 rounded-lg bg-emerald-500 py-3 active:bg-emerald-600 disabled:opacity-60"
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center font-semibold text-slate-900 dark:text-white">Sign in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
