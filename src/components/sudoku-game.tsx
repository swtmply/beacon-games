import { BottomSheet, Host } from '@expo/ui';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useCallback, useRef, useState, type RefObject } from 'react';
import { AppState, Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';

import { Eyebrow, GameButton, GamePage, NativeButton, SaveNotice } from '@/components/game-ui';
import { SudokuBoard } from '@/components/sudoku-board';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { newSession, useGames, useGamesStatus, type Session } from '@/hooks/use-games';
import { useInteractionSound } from '@/hooks/use-interaction-sound';
import { useTheme } from '@/hooks/use-theme';
import { arePeers, chapterFor, DIGITS, formatTime, LEVEL_COUNT, levelId, type Puzzle } from '@/utils/sudoku';

function GameTimer({ current, initialElapsed, paused, puzzleId, onPause }: {
  current: RefObject<Session>; initialElapsed: number; paused: boolean; puzzleId: string; onPause: () => void;
}) {
  const { save } = useGamesStatus();
  const [elapsed, setElapsed] = useState(initialElapsed);

  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      const latest = current.current;
      if (paused || latest.completed || AppState.currentState !== 'active') return;
      const next = { ...latest, elapsed: latest.elapsed + 1 };
      current.current = next;
      setElapsed(next.elapsed);
      if (next.elapsed % 10 === 0) save(puzzleId, next);
    }, 1000);
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        save(puzzleId, current.current);
        if (!current.current.completed) onPause();
      }
    });
    return () => { clearInterval(timer); listener.remove(); save(puzzleId, current.current); };
  }, [current, onPause, paused, puzzleId, save]));

  return <View style={{ alignItems: 'flex-end', gap: 2 }}>
    <ThemedText selectable style={{ fontSize: 24, fontWeight: '400', fontVariant: ['tabular-nums'] }}>{formatTime(elapsed)}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>your time</ThemedText>
  </View>;
}

export function SudokuGame({ puzzle }: { puzzle: Puzzle }) {
  const theme = useTheme();
  const playSound = useInteractionSound();
  const { height, width } = useWindowDimensions();
  const { sessions, save } = useGames();
  const [session, setSession] = useState(() => sessions[puzzle.id] ?? newSession(puzzle));
  const current = useRef(session);
  const [selected, setSelected] = useState(() => Math.max(0, puzzle.givens.indexOf(0)));
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [pencil, setPencil] = useState(false);
  const [sheet, setSheet] = useState<'pause' | 'complete' | null>(null);
  const paused = sheet !== null;
  const numberSize = Math.min(58, (width - 40 - 32) / 5);
  const pause = useCallback(() => setSheet('pause'), [setSheet]);

  function isDigitComplete(digit: number, values: number[]) {
    return values.filter(value => value === digit).length >= 9;
  }

  function select(index: number) {
    if (paused) return;
    playSound();
    clearMistakes();
    setSelected(index);
    if (selectedDigit !== null) enter(index, selectedDigit);
  }

  function selectDigit(digit: number) {
    if (paused || current.current.completed || isDigitComplete(digit, current.current.values)) return;
    playSound();
    clearMistakes();
    setSelectedDigit(digit);
  }

  const update = useCallback((next: Session) => {
    current.current = next;
    setSession(next);
    save(puzzle.id, next);
  }, [puzzle.id, save]);

  function commit(values: number[], notes: number[][], extra: Partial<Pick<Session, 'mistakes' | 'hints'>> = {}) {
    const previous = current.current;
    const completed = values.every((value, index) => value === puzzle.solution[index]);
    update({ ...previous, values, notes, ...extra, completed });
    if (selectedDigit !== null && isDigitComplete(selectedDigit, values)) setSelectedDigit(null);
    if (completed) setSheet('complete');
  }

  function clearMistakes() {
    const previous = current.current;
    const values = previous.values.map((value, index) => value && value !== puzzle.solution[index] ? 0 : value);
    if (values.some((value, index) => value !== previous.values[index])) update({ ...previous, values });
  }

  function enter(selected: number, digit: number) {
    const previous = current.current;
    if (isDigitComplete(digit, previous.values)) return;
    if (previous.completed || puzzle.givens[selected] || previous.values[selected] === puzzle.solution[selected]) return;
    if (pencil) {
      const notes = previous.notes.map((cell, index) => index !== selected ? cell : cell.includes(digit) ? cell.filter(value => value !== digit) : [...cell, digit].sort());
      commit(previous.values, notes);
      return;
    }
    const wrong = digit !== puzzle.solution[selected];
    const values = previous.values.map((value, index) => index === selected ? digit : value);
    const notes = previous.notes.map((cell, index) => {
      if (wrong) return cell;
      if (index === selected) return cell.length ? [] : cell;
      return arePeers(selected, index) && cell.includes(digit) ? cell.filter(value => value !== digit) : cell;
    });
    commit(values, notes, { mistakes: previous.mistakes + Number(wrong) });
  }

  function hint() {
    if (paused || current.current.completed) return;
    clearMistakes();
    const previous = current.current;
    const index = !puzzle.givens[selected] && previous.values[selected] !== puzzle.solution[selected] ? selected : previous.values.findIndex((value, i) => value !== puzzle.solution[i]);
    if (index < 0) return;
    const digit = puzzle.solution[index];
    const values = previous.values.map((value, i) => i === index ? digit : value);
    const notes = previous.notes.map((cell, i) => {
      if (i === index) return cell.length ? [] : cell;
      return arePeers(index, i) && cell.includes(digit) ? cell.filter(value => value !== digit) : cell;
    });
    setSelected(index);
    setPencil(false);
    commit(values, notes, { hints: previous.hints + 1 });
  }

  const title = puzzle.mode === 'daily' ? 'Daily puzzle' : `Level ${puzzle.level}`;
  const filled = session.values.filter((value, i) => !puzzle.givens[i] && value === puzzle.solution[i]).length;
  const emptyCount = puzzle.givens.filter(value => !value).length;
  const subtitle = puzzle.mode === 'daily' ? new Date(`${puzzle.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : chapterFor(puzzle.level).name;

  return <>
    <Stack.Screen options={{ title }} />
    <GamePage contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 18 }}>
      <SaveNotice />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 5, flex: 1 }}>
          <Eyebrow>{subtitle}</Eyebrow>
          <ThemedText themeColor="primary" type="smallBold">{puzzle.difficulty} · {filled}/{emptyCount} filled</ThemedText>
        </View>
        <GameTimer current={current} initialElapsed={session.elapsed} paused={paused} puzzleId={puzzle.id} onPause={pause} />
      </View>
      <View style={{ position: 'relative' }}>
        <SudokuBoard puzzle={puzzle} values={session.values} notes={session.notes} selected={selected} selectedDigit={selectedDigit} onSelect={select} completed={session.completed} />
        {sheet === 'pause' ? <View style={{ position: 'absolute', inset: 0, backgroundColor: theme.backgroundSelected, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ fontFamily: Fonts.serif, fontSize: 32 }}>Take a breather.</ThemedText></View> : null}
      </View>
      <View style={{ gap: 10 }}>
        {[DIGITS.slice(0, 5), DIGITS.slice(5)].map((row, index) => <View key={index} style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {row.map(digit => {
            const disabled = paused || session.completed || isDigitComplete(digit, session.values);
            return <Pressable key={digit} disabled={disabled} onPress={() => selectDigit(digit)} testID={`digit-${digit}`}
              accessibilityRole="button" accessibilityLabel={`Number ${digit}`} accessibilityHint={pencil ? 'Select this note, then tap a cell to add or remove it' : 'Select this number, then tap a cell to place it'}
              accessibilityState={{ selected: selectedDigit === digit, disabled }}
              style={({ pressed }) => ({ width: numberSize, height: numberSize, borderRadius: numberSize / 2, borderCurve: 'circular', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: pencil ? 'dashed' : 'solid', borderColor: pencil ? selectedDigit === digit ? theme.primaryText : theme.primary : 'transparent', backgroundColor: selectedDigit === digit ? theme.primary : theme.backgroundSelected, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 })}>
              <ThemedText maxFontSizeMultiplier={1.25} style={{ fontSize: 23, lineHeight: 28, fontWeight: '600', color: selectedDigit === digit ? theme.primaryText : theme.primary }}>{String(digit)}</ThemedText>
            </Pressable>;
          })}
        </View>)}
      </View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <ThemedText type="smallBold" themeColor="primary">Notes</ThemedText>
        <View style={{ width: 76, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Switch value={pencil} onValueChange={value => { playSound(); setPencil(value); }} disabled={paused || session.completed} accessibilityLabel="Notes mode" testID="notes-toggle"
            style={{ transform: [{ scale: 1.4 }] }} trackColor={{ false: theme.border, true: theme.primary }} ios_backgroundColor={theme.border} />
        </View>
        <View style={{ position: 'absolute', right: 0, bottom: 4, width: '30%', maxWidth: 110 }}><NativeButton label="Hint" fontSize={12} disabled={paused || session.completed} onPress={hint} backgroundColor={theme.backgroundElement} /></View>
      </View>
      {session.completed ? <GameButton label="Puzzle complete  ✓" onPress={() => setSheet('complete')} /> : null}
    </GamePage>
    <Host>
      <BottomSheet isPresented={sheet !== null} onDismiss={() => setSheet(null)} containerColor={theme.background} contentPadding={0} snapPoints={['full']}>
        <ScrollView style={{ width: '100%', height: Math.round(height * 0.85) }} contentContainerStyle={{ gap: 20, padding: 24, paddingBottom: 48 }}>
          <Eyebrow>{sheet === 'complete' ? 'A little victory' : 'No rush'}</Eyebrow>
          <ThemedText style={{ fontFamily: Fonts.serif, fontSize: 34, lineHeight: 40, fontWeight: '400' }}>{sheet === 'complete' ? 'Everything in its place.' : 'Take a breather.'}</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontWeight: '400' }}>{sheet === 'complete' ? `You solved ${title.toLowerCase()} in ${formatTime(session.elapsed)}, with ${session.hints} hints.` : 'Your timer is paused. Pick up where you left off when you’re ready.'}</ThemedText>
          {sheet === 'complete' && puzzle.mode === 'adventure' && puzzle.level < LEVEL_COUNT ? <GameButton label={`On to level ${puzzle.level + 1}  →`} onPress={() => { setSheet(null); router.replace({ pathname: '/sudoku/[id]', params: { id: levelId(puzzle.level + 1) } }); }} /> : null}
          {sheet === 'complete' && puzzle.mode === 'adventure' && puzzle.level === LEVEL_COUNT ? <ThemedText themeColor="primary">You’ve reached the summit. All 24 levels complete.</ThemedText> : null}
          <GameButton label={sheet === 'pause' ? 'Keep playing' : 'View my puzzle'} onPress={() => setSheet(null)} secondary={sheet === 'complete'} />
          {sheet === 'complete' ? <GameButton secondary label={puzzle.mode === 'adventure' ? 'Back to the trail' : 'Back to Sudoku'} onPress={() => { setSheet(null); router.replace(puzzle.mode === 'adventure' ? '/sudoku/adventure' : '/sudoku'); }} /> : null}
        </ScrollView>
      </BottomSheet>
    </Host>
  </>;
}
