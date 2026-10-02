import { router } from 'expo-router';
import { View } from 'react-native';

import { Eyebrow, GameButton, GamePage, Headline, MiniBoard, SaveNotice } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function CatalogScreen() {
  const theme = useTheme();
  return <GamePage>
    <View style={{ gap: 14, paddingTop: 12, paddingBottom: 8 }}>
      <Eyebrow>A pocketful of play</Eyebrow>
      <Headline>{'A little play,\nevery day.'}</Headline>
      <ThemedText themeColor="textSecondary" style={{ maxWidth: 300, fontWeight: '400' }}>Good games. Familiar faces. A moment just for you.</ThemedText>
    </View>
    <SaveNotice />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Eyebrow>Your game shelf</Eyebrow>
      <ThemedText type="small" themeColor="textSecondary">01 game</ThemedText>
    </View>
    <View style={{ borderRadius: 28, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundElement, overflow: 'hidden' }}>
      <View style={{ backgroundColor: theme.backgroundSelected, minHeight: 210, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 8, flex: 1 }}>
          <ThemedText type="smallBold" themeColor="primary" style={{ letterSpacing: 2 }}>NO. 001</ThemedText>
          <ThemedText themeColor="primary" style={{ fontSize: 55, lineHeight: 64, fontWeight: '400' }}>1 2 3</ThemedText>
          <ThemedText themeColor="primary" type="small" style={{ fontWeight: '400' }}>Nine numbers. Endless possibility.</ThemedText>
        </View>
        <MiniBoard compact />
      </View>
      <View style={{ padding: 24, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <ThemedText style={{ fontSize: 30, fontWeight: '600' }}>Sudoku</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontWeight: '400' }}>A fresh daily puzzle or a trail of challenges. Find your own rhythm.</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['Logic', 'Daily puzzles', 'Adventure'].map(label => <View key={label} style={{ backgroundColor: theme.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{label}</ThemedText></View>)}
        </View>
        <GameButton label="Play Sudoku  →" onPress={() => router.push('/sudoku')} />
      </View>
    </View>
    <View style={{ alignItems: 'center', gap: 6, paddingVertical: 16 }}>
      <ThemedText type="smallBold" themeColor="primary">Your games go wherever you go.</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '400' }}>Always available offline. Progress saved here.</ThemedText>
    </View>
  </GamePage>;
}
