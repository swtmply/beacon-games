import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Eyebrow, GameButton, GamePage, Headline, MiniBoard, SaveNotice } from '@/components/game-ui';
import { ThemedText } from '@/components/themed-text';
import { useGames } from '@/hooks/use-games';
import { useTheme } from '@/hooks/use-theme';
import { chapterFor, DAILY_DIFFICULTIES, dailyId, formatTime, getPuzzle, LEVEL_COUNT, levelId, localDate, type DailyDifficulty } from '@/utils/sudoku';

export default function SudokuScreen() {
  const theme = useTheme();
  const { sessions, unlocked } = useGames();
  const [today, setToday] = useState(localDate);
  const [difficulty, setDifficulty] = useState<DailyDifficulty>('Easy');
  useFocusEffect(useCallback(() => { setToday(localDate()); }, []));
  useEffect(() => { const timer = setInterval(() => setToday(localDate()), 30000); return () => clearInterval(timer); }, []);
  const legacyId = dailyId(today);
  const id = sessions[legacyId] && getPuzzle(legacyId)?.difficulty === difficulty ? legacyId : dailyId(today, difficulty);
  const daily = getPuzzle(id);
  const savedDaily = sessions[id];
  const completed = Object.entries(sessions).filter(([key, session]) => key.startsWith('level-') && session.completed).length;
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', weekday: 'short' });

  return <GamePage>
    <View style={{ gap: 12 }}>
      <Eyebrow>A moment of focus</Eyebrow>
      <Headline>Make room for a little logic.</Headline>
      <ThemedText themeColor="textSecondary" style={{ fontWeight: '400' }}>One grid. Two ways to find your flow.</ThemedText>
    </View>
    <SaveNotice />
    <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, borderRadius: 24, padding: 24, gap: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Eyebrow>The daily ritual</Eyebrow>
          <ThemedText style={{ fontSize: 28, fontWeight: '600' }}>Daily puzzle</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{dateLabel}</ThemedText>
          <ThemedText type="smallBold" themeColor="primary">{daily?.difficulty} · {savedDaily?.completed ? 'Complete ✓' : 'A fresh start, every day'}</ThemedText>
        </View>
        <MiniBoard compact />
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Daily puzzle difficulty" style={{ flexDirection: 'row', gap: 8 }}>
        {DAILY_DIFFICULTIES.map(option => <Pressable key={option} onPress={() => setDifficulty(option)} accessibilityRole="radio"
          accessibilityLabel={option} accessibilityState={{ checked: difficulty === option }} testID={`daily-${option.toLowerCase()}`}
          style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: difficulty === option ? theme.primary : theme.backgroundSelected, opacity: pressed ? 0.75 : 1 })}>
          <ThemedText type="smallBold" style={{ color: difficulty === option ? theme.primaryText : theme.primary }}>{option}</ThemedText>
        </Pressable>)}
      </View>
      <ThemedText themeColor="textSecondary" type="small" style={{ fontWeight: '400' }}>A new puzzle at each difficulty, every local midnight. Your progress is saved separately.</ThemedText>
      {savedDaily?.completed ? <ThemedText themeColor="primary" type="smallBold">Solved in {formatTime(savedDaily.elapsed)}. See you tomorrow.</ThemedText> : null}
      <GameButton label={savedDaily?.completed ? 'View completed puzzle' : savedDaily ? 'Continue daily puzzle  →' : 'Play today’s puzzle  →'} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id } })} />
    </View>
    <View style={{ backgroundColor: theme.backgroundSelected, borderRadius: 24, padding: 24, gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Eyebrow>Take the scenic route</Eyebrow>
        <ThemedText style={{ fontSize: 28, fontWeight: '600' }}>Adventure</ThemedText>
        <ThemedText themeColor="textSecondary" style={{ fontWeight: '400' }}>From first light to the summit. Every level brings a harder puzzle.</ThemedText>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ThemedText type="smallBold" themeColor="primary">{completed === LEVEL_COUNT ? 'Trail complete ✓' : `Level ${unlocked} · ${chapterFor(unlocked).name}`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{completed}/{LEVEL_COUNT}</ThemedText>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: LEVEL_COUNT, now: completed }} style={{ height: 5, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${completed / LEVEL_COUNT * 100}%`, height: '100%', backgroundColor: theme.primary }} />
        </View>
      </View>
      <GameButton label={completed === LEVEL_COUNT ? 'Revisit the trail  →' : 'Explore the trail  →'} onPress={() => router.push('/sudoku/adventure')} />
      {completed < LEVEL_COUNT && sessions[levelId(unlocked)] ? <GameButton secondary label={`Continue level ${unlocked}`} onPress={() => router.push({ pathname: '/sudoku/[id]', params: { id: levelId(unlocked) } })} /> : null}
    </View>
    <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', fontWeight: '400' }}>No signal? No problem. Both modes work offline.</ThemedText>
  </GamePage>;
}
