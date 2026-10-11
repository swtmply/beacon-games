import { router } from 'expo-router';
import { View } from 'react-native';

import { GameButton, GamePage, Headline, MiniBoard, SaveNotice } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { LEVEL_COUNT } from '@/utils/sudoku';

export default function CatalogScreen() {
  const theme = useTheme();
  return <GamePage>
    <View style={{ paddingTop: 12, paddingBottom: 8 }}>
      <Headline>{'Find your\nnext move.'}</Headline>
    </View>
    <SaveNotice />
    <View style={{ borderRadius: 28, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundElement, overflow: 'hidden' }}>
      <View style={{ backgroundColor: theme.backgroundSelected, minHeight: 220, padding: 24, gap: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 8, flex: 1, minWidth: 140 }}>
          <ThemedText type="smallBold" themeColor="accent" style={{ letterSpacing: 2 }}>01 / LOGIC</ThemedText>
          <ThemedText style={{ fontSize: 42, lineHeight: 50, fontWeight: '600', letterSpacing: -1 }}>Sudoku</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">Every square counts.</ThemedText>
        </View>
        <MiniBoard />
      </View>
      <View style={{ padding: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['Daily puzzles', `${LEVEL_COUNT} adventure levels`].map(label => <ThemedText key={label} type="small" themeColor="textSecondary">{label}</ThemedText>)}
        </View>
        <GameButton label="Play Sudoku  →" onPress={() => router.push('/sudoku')} />
      </View>
    </View>
    <View style={{ alignItems: 'center', gap: 6, paddingVertical: 16 }}>
      <ThemedText type="small" themeColor="textSecondary">Play offline · Progress saved on this device</ThemedText>
    </View>
  </GamePage>;
}
