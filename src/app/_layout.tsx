import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { GameButton } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GamesProvider, useGamesStatus } from '@/hooks/use-games';
import { InteractionSoundProvider } from '@/hooks/use-interaction-sound';
import { useTheme } from '@/hooks/use-theme';

function Navigation() {
  const theme = useTheme();
  const { ready, error, retry } = useGamesStatus();
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', padding: 32, gap: 16, backgroundColor: theme.background }}>
    {error ? <><ThemedText accessibilityRole="alert">{error}</ThemedText><GameButton label="Retry" onPress={retry} /></> : <ActivityIndicator color={theme.primary} accessibilityLabel="Loading your saved games" />}
  </View>;
  return <>
    <StatusBar style="auto" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.text, headerShadowVisible: false, contentStyle: { backgroundColor: theme.background }, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'beacon', headerTitleStyle: { fontSize: 24, fontWeight: '700' } }} />
      <Stack.Screen name="sudoku/index" options={{ title: 'Sudoku' }} />
      <Stack.Screen name="sudoku/adventure" options={{ title: 'Adventure' }} />
      <Stack.Screen name="sudoku/[id]" options={{ title: 'Sudoku' }} />
    </Stack>
  </>;
}

export default function RootLayout() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  return <ThemeProvider value={{
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      primary: theme.primary,
      border: theme.border,
    },
  }}>
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <InteractionSoundProvider><GamesProvider><Navigation /></GamesProvider></InteractionSoundProvider>
    </View>
  </ThemeProvider>;
}
