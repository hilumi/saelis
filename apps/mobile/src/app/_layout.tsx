import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LaunchScreen } from "@/components/launch-screen";
import { SessionProvider } from "@/lib/session";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

/** Saelis is always light: soft sky, ink text — never a dark theme. */
const saelisNavigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent.lilac,
    background: colors.pearlWhite,
    card: colors.pearlWhite,
    text: colors.text.primary,
    border: colors.sky.lilac,
    notification: colors.accent.blush,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={saelisNavigationTheme}>
        <SessionProvider>
          <StatusBar style="dark" />
          {ready ? (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          ) : (
            <LaunchScreen />
          )}
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
