import { router } from 'expo-router';
import { View } from 'react-native';

import { GameButton, GamePage, Headline, NativeButton, SaveNotice } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { useGames } from '@/hooks/use-games';
import { useTheme } from '@/hooks/use-theme';
import { CHAPTERS, LEVEL_COUNT, levelId } from '@/utils/sudoku';

export default function AdventureScreen() {
  const theme = useTheme();
  const { sessions, unlocked } = useGames();
  const completed = Array.from({ length: LEVEL_COUNT }, (_, i) => sessions[levelId(i + 1)]?.completed).filter(Boolean).length;
  return <GamePage>
    <Headline>{'One level\nfurther.'}</Headline>
    <SaveNotice />
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <ThemedText type="smallBold" themeColor="accent">{completed === LEVEL_COUNT ? 'Adventure complete ✓' : 'Your progress'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>{completed} / {LEVEL_COUNT} levels</ThemedText>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="Adventure levels completed" aria-valuemin={0} aria-valuemax={LEVEL_COUNT} aria-valuenow={completed} accessibilityValue={{ min: 0, max: LEVEL_COUNT, now: completed }} style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${completed / LEVEL_COUNT * 100}%`, height: '100%', backgroundColor: theme.accent }} />
      </View>
      {completed < LEVEL_COUNT ? <GameButton label={`${sessions[levelId(unlocked)] ? 'Continue' : 'Start'} level ${unlocked}  →`} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id: levelId(unlocked) } })} /> : null}
    </View>
    {CHAPTERS.map((chapter, chapterIndex) => {
      const chapterCompleted = Array.from({ length: 6 }, (_, index) => sessions[levelId(chapterIndex * 6 + index + 1)]?.completed).filter(Boolean).length;
      return <View key={chapter.name} style={{ gap: 16, borderTopWidth: 1, borderColor: theme.border, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}><ThemedText themeColor="accent" type="smallBold">0{chapterIndex + 1}</ThemedText></View>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontSize: 20, fontWeight: '600' }}>{chapter.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{chapter.difficulty}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>{chapterCompleted}/6</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const level = chapterIndex * 6 + i + 1;
          const done = sessions[levelId(level)]?.completed;
          const locked = level > unlocked;
          const current = level === unlocked && !done;
          return <View key={level} style={{ width: '30%', flexGrow: 1, borderWidth: current ? 2 : 1, borderColor: current ? theme.accent : theme.border, borderRadius: 18, backgroundColor: current ? theme.accentSoft : done ? theme.backgroundSelected : theme.backgroundElement, padding: 8, gap: 5, alignItems: 'center', opacity: locked ? 0.6 : 1 }}>
            <NativeButton disabled={locked} label={String(level).padStart(2, '0')} height={60} fontSize={27} color={locked ? theme.textSecondary : theme.primary} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id: levelId(level) } })} testID={`adventure-level-${level}`} />
            <ThemedText type="small" themeColor={locked ? 'textSecondary' : 'accent'} style={{ fontSize: 11 }}>{done ? 'Complete ✓' : locked ? 'Locked' : sessions[levelId(level)] ? 'Continue →' : 'Play →'}</ThemedText>
          </View>;
        })}
      </View>
    </View>;
    })}
  </GamePage>;
}
