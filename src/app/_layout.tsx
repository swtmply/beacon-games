import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { GameButton } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { GamesProvider, useGames } from '@/hooks/use-games';
import { useTheme } from '@/hooks/use-theme';

function Navigation() {
  const theme = useTheme();
  const { ready, error, retry } = useGames();
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
  return <GamesProvider><Navigation /></GamesProvider>;
}
