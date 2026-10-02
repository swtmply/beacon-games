import { router } from 'expo-router';
import { View } from 'react-native';

import { Eyebrow, GameButton, GamePage, Headline, NativeButton, SaveNotice } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { useGames } from '@/hooks/use-games';
import { useTheme } from '@/hooks/use-theme';
import { CHAPTERS, LEVEL_COUNT, levelId } from '@/utils/sudoku';

export default function AdventureScreen() {
  const theme = useTheme();
  const { sessions, unlocked } = useGames();
  const completed = Array.from({ length: LEVEL_COUNT }, (_, i) => sessions[levelId(i + 1)]?.completed).filter(Boolean).length;
  return <GamePage>
    <View style={{ gap: 12 }}>
      <Eyebrow>Your Sudoku journey</Eyebrow>
      <Headline>{'A small step.\nA sharper mind.'}</Headline>
      <ThemedText themeColor="textSecondary" style={{ fontWeight: '400' }}>Solve a level to open the next. Take your time; the trail will wait.</ThemedText>
    </View>
    <SaveNotice />
    <View style={{ backgroundColor: theme.backgroundSelected, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
      <ThemedText type="smallBold" themeColor="primary">{completed === LEVEL_COUNT ? 'You reached the summit ✓' : 'Your progress'}</ThemedText>
      <ThemedText type="small" themeColor="primary">{completed} / {LEVEL_COUNT} levels</ThemedText>
    </View>
    {CHAPTERS.map((chapter, chapterIndex) => <View key={chapter.name} style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}><ThemedText themeColor="accent" type="smallBold">0{chapterIndex + 1}</ThemedText></View>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontSize: 20, fontWeight: '600' }}>{chapter.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{chapter.difficulty} · {chapter.description}</ThemedText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const level = chapterIndex * 6 + i + 1;
          const done = sessions[levelId(level)]?.completed;
          const locked = level > unlocked;
          return <View key={level} style={{ width: '30%', flexGrow: 1, borderWidth: 1, borderColor: level === unlocked ? theme.primary : theme.border, borderRadius: 18, backgroundColor: done ? theme.backgroundSelected : theme.backgroundElement, padding: 8, gap: 5, alignItems: 'center' }}>
            <NativeButton disabled={locked} label={String(level).padStart(2, '0')} height={60} fontSize={27} color={locked ? theme.textSecondary : theme.primary} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id: levelId(level) } })} testID={`adventure-level-${level}`} />
            <ThemedText type="small" themeColor={locked ? 'textSecondary' : 'primary'} style={{ fontSize: 11 }}>{done ? 'Complete ✓' : locked ? 'Locked' : 'Play →'}</ThemedText>
          </View>;
        })}
      </View>
      {chapterIndex === 0 && completed < LEVEL_COUNT ? <GameButton label={`${sessions[levelId(unlocked)] ? 'Continue' : 'Start'} level ${unlocked}  →`} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id: levelId(unlocked) } })} /> : null}
    </View>)}
  </GamePage>;
}
