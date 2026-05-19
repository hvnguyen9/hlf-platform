// Theme state: light | dark | system. NativeWind owns the actual color
// scheme; we just persist the user's pick to secure-store and re-apply on
// boot so the choice survives app restarts.

import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import * as SecureStore from "expo-secure-store";

const KEY = "hlf.theme";

export type ThemeMode = "light" | "dark" | "system";

function isMode(v: string | null): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

// Mount once at the root. Reads the persisted mode and applies it to
// NativeWind. Renders nothing.
export function ThemeBoot() {
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(KEY).then((stored) => {
      if (cancelled) return;
      if (isMode(stored)) setColorScheme(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [setColorScheme]);
  return null;
}

export function useTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  function setMode(mode: ThemeMode) {
    setColorScheme(mode);
    void SecureStore.setItemAsync(KEY, mode);
  }
  return {
    // NativeWind tracks the EFFECTIVE scheme ("light" | "dark"). To know
    // whether the user chose "system" vs explicit, we'd need a separate
    // ref — but for the UI it's enough to show the effective state.
    scheme: colorScheme,
    setMode,
  };
}
