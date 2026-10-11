import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GameButton, GamePage, Headline, MiniBoard, SaveNotice } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { useGames } from '@/hooks/use-games';
import { useInteractionSound } from '@/hooks/use-interaction-sound';
import { useTheme } from '@/hooks/use-theme';
import { chapterFor, DAILY_DIFFICULTIES, dailyId, formatTime, getPuzzle, LEVEL_COUNT, levelId, localDate, type DailyDifficulty } from '@/utils/sudoku';

export default function SudokuScreen() {
  const theme = useTheme();
  const playSound = useInteractionSound();
  const { sessions, unlocked } = useGames();
  const [today, setToday] = useState(localDate);
  const [difficulty, setDifficulty] = useState<DailyDifficulty>('Easy');
  useFocusEffect(useCallback(() => { setToday(localDate()); }, []));
  useEffect(() => { const timer = setInterval(() => setToday(localDate()), 30000); return () => clearInterval(timer); }, []);
  const legacyId = dailyId(today);
  const id = sessions[legacyId] && getPuzzle(legacyId)?.difficulty === difficulty ? legacyId : dailyId(today, difficulty);
  const daily = getPuzzle(id);
  const savedDaily = sessions[id];
  const completed = Array.from({ length: LEVEL_COUNT }, (_, index) => sessions[levelId(index + 1)]?.completed).filter(Boolean).length;
  const filled = savedDaily?.values.filter(value => value !== 0).length ?? daily?.givens.filter(value => value !== 0).length ?? 0;
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', weekday: 'short' });

  return <GamePage>
    <Headline>{'One grid.\nYour next move.'}</Headline>
    <SaveNotice />
    <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, borderRadius: 24, padding: 24, gap: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <ThemedText style={{ fontSize: 28, fontWeight: '600' }}>Daily puzzle</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{dateLabel}</ThemedText>
          <ThemedText type="smallBold" themeColor="accent">{savedDaily?.completed ? 'Solved ✓' : savedDaily ? 'In progress' : 'Ready when you are'}</ThemedText>
        </View>
        <MiniBoard compact />
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Daily puzzle difficulty" style={{ flexDirection: 'row', gap: 8 }}>
        {DAILY_DIFFICULTIES.map(option => <Pressable key={option} onPress={() => { playSound(); setDifficulty(option); }} accessibilityRole="radio"
          accessibilityLabel={option} aria-checked={difficulty === option} accessibilityState={{ checked: difficulty === option }} testID={`daily-${option.toLowerCase()}`}
          style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: difficulty === option ? theme.primary : theme.backgroundSelected, opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <ThemedText type="smallBold" style={{ color: difficulty === option ? theme.primaryText : theme.primary }}>{option}</ThemedText>
        </Pressable>)}
      </View>
      {savedDaily ? <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <ThemedText type="small" themeColor="textSecondary">{filled}/81 squares filled</ThemedText>
          <ThemedText type="smallBold" themeColor="accent" style={{ fontVariant: ['tabular-nums'] }}>{formatTime(savedDaily.elapsed)}</ThemedText>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel="Daily squares filled" aria-valuemin={0} aria-valuemax={81} aria-valuenow={filled} accessibilityValue={{ min: 0, max: 81, now: filled }} style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${filled / 81 * 100}%`, height: '100%', backgroundColor: theme.accent }} />
        </View>
      </View> : <ThemedText themeColor="textSecondary" type="small">A fresh puzzle for each difficulty, every midnight.</ThemedText>}
      <GameButton label={savedDaily?.completed ? 'View completed puzzle' : savedDaily ? 'Continue daily puzzle  →' : 'Play today’s puzzle  →'} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id } })} />
    </View>
    <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: 24, gap: 20 }}>
      <ThemedText style={{ fontSize: 28, fontWeight: '600' }}>Adventure</ThemedText>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ThemedText type="smallBold" themeColor="primary">{completed === LEVEL_COUNT ? 'Trail complete ✓' : `Level ${unlocked} · ${chapterFor(unlocked).name}`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{completed}/{LEVEL_COUNT}</ThemedText>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel="Adventure levels completed" aria-valuemin={0} aria-valuemax={LEVEL_COUNT} aria-valuenow={completed} accessibilityValue={{ min: 0, max: LEVEL_COUNT, now: completed }} style={{ height: 5, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${completed / LEVEL_COUNT * 100}%`, height: '100%', backgroundColor: theme.accent }} />
        </View>
      </View>
      <GameButton label={completed === LEVEL_COUNT ? 'Revisit the trail  →' : 'Explore the trail  →'} onPress={() => router.push('/sudoku/adventure')} />
      {completed < LEVEL_COUNT && sessions[levelId(unlocked)] ? <GameButton secondary label={`Continue level ${unlocked}`} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id: levelId(unlocked) } })} /> : null}
    </View>
    <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', fontWeight: '400' }}>No signal? No problem. Both modes work offline.</ThemedText>
  </GamePage>;
}
