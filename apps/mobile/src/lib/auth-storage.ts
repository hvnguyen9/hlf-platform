// Persistent storage for the mobile auth token + cached user. Wraps
// expo-secure-store so the token sits in the OS keystore rather than
// AsyncStorage.

import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "hlf.auth.token";
const USER_KEY = "hlf.auth.user";

export type StoredUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
};

export async function loadSession(): Promise<{
  token: string | null;
  user: StoredUser | null;
}> {
  const [token, userRaw] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  return {
    token,
    user: userRaw ? (JSON.parse(userRaw) as StoredUser) : null,
  };
}

export async function saveSession(token: string, user: StoredUser) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
