import { BottomSheet, Host } from '@expo/ui';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameButton, NativeButton, SaveNotice } from '@/components/game-ui';
import { SudokuBoard } from '@/components/sudoku-board';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { newSession, useGames, useGamesStatus, type Session } from '@/hooks/use-games';
import { useInteractionSound, type InteractionSound } from '@/hooks/use-interaction-sound';
import { useTheme } from '@/hooks/use-theme';
import { clearNotesForEntry, DIGITS, formatTime, LEVEL_COUNT, levelId, type Puzzle } from '@/utils/sudoku';

const MAX_LIVES = 5;
const feedbackEasing = cubicBezier(0.23, 1, 0.32, 1);

function GameTimer({ getSession, initialElapsed, onTick, paused, puzzleId }: {
  getSession: () => Session;
  initialElapsed: number;
  onTick: (elapsed: number) => void;
  paused: boolean;
  puzzleId: string;
}) {
  const { save } = useGamesStatus();
  const [elapsed, setElapsed] = useState(initialElapsed);

  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      const latest = getSession();
      if (paused || latest.completed || latest.mistakes >= MAX_LIVES || AppState.currentState !== 'active') return;
      const next = { ...latest, elapsed: latest.elapsed + 1 };
      onTick(next.elapsed);
      setElapsed(next.elapsed);
      if (next.elapsed % 10 === 0) save(puzzleId, next);
    }, 1000);
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') save(puzzleId, getSession());
    });
    return () => {
      clearInterval(timer);
      listener.remove();
      save(puzzleId, getSession());
    };
  }, [getSession, onTick, paused, puzzleId, save]));

  return <View style={{ alignItems: 'flex-end', gap: 2 }}>
    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>TIME</ThemedText>
    <ThemedText selectable style={{ fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{formatTime(elapsed)}</ThemedText>
  </View>;
}

export function SudokuGame({ puzzle }: { puzzle: Puzzle }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const playSound = useInteractionSound();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [boardSize, setBoardSize] = useState(0);
  const { sessions, save } = useGames();
  const [session, setSession] = useState(() => sessions[puzzle.id] ?? newSession(puzzle));
  // Timer ticks update the live session; moves copy it into state to refresh the board.
  const current = useRef(session);
  const [selected, setSelected] = useState(() => Math.max(0, puzzle.givens.indexOf(0)));
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [promptCell, setPromptCell] = useState<number | null>(null);
  const [pencil, setPencil] = useState(false);
  const [completedCells, setCompletedCells] = useState<number[]>([]);
  const lives = Math.max(0, MAX_LIVES - session.mistakes);
  const failed = lives === 0 && !session.completed;
  const [sheet, setSheet] = useState<'complete' | 'failed' | null>(() => failed ? 'failed' : null);
  const paused = failed || sheet !== null;
  const numberSize = Math.min(52, (width - 32 - 32) / 5);

  function isDigitComplete(digit: number, values: number[]) {
    return values.filter((value, index) => value === digit && value === puzzle.solution[index]).length === 9;
  }

  function select(index: number) {
    if (paused || current.current.mistakes >= MAX_LIVES) return;
    clearMistakes();
    setSelected(index);
    setPromptCell(selectedDigit === null && !current.current.completed ? index : null);
    if (selectedDigit === null || !enter(index, selectedDigit)) playSound();
  }

  function selectDigit(digit: number) {
    if (paused || current.current.completed || current.current.mistakes >= MAX_LIVES || isDigitComplete(digit, current.current.values)) return;
    playSound();
    clearMistakes();
    setPromptCell(null);
    setSelectedDigit(previous => previous === digit ? null : digit);
  }

  const getSession = useCallback(() => current.current, []);

  const recordElapsed = useCallback((elapsed: number) => {
    current.current = { ...current.current, elapsed };
  }, []);

  const updateSession = useCallback((next: Session) => {
    current.current = next;
    setSession(next);
    save(puzzle.id, next);
  }, [puzzle.id, save]);

  function commit(values: number[], notes: number[][], extra: Partial<Pick<Session, 'mistakes' | 'hints'>> = {}) {
    const previous = current.current;
    const completed = values.every((value, index) => value === puzzle.solution[index]);
    const next = { ...previous, values, notes, ...extra, completed };
    updateSession(next);
    if (selectedDigit !== null && isDigitComplete(selectedDigit, values)) setSelectedDigit(null);
    if (completed) setSheet('complete');
    else if (next.mistakes >= MAX_LIVES) setSheet('failed');
  }

  function restart() {
    updateSession(newSession(puzzle));
    setSelected(Math.max(0, puzzle.givens.indexOf(0)));
    setSelectedDigit(null);
    setPromptCell(null);
    setPencil(false);
    setCompletedCells([]);
    setSheet(null);
  }

  function goToMenu() {
    setSheet(null);
    router.replace(puzzle.mode === 'adventure' ? '/sudoku/adventure' : '/sudoku');
  }

  function dismissSheet() {
    if (!current.current.completed && current.current.mistakes >= MAX_LIVES) goToMenu();
    else setSheet(null);
  }

  function clearMistakes() {
    const previous = current.current;
    const values = previous.values.map((value, index) => value && value !== puzzle.solution[index] ? 0 : value);
    if (values.some((value, index) => value !== previous.values[index])) updateSession({ ...previous, values });
  }

  function showAnswerFeedback(index: number, previous: number[], values: number[]) {
    const rowStart = Math.floor(index / 9) * 9;
    const column = index % 9;
    const boxStart = Math.floor(index / 27) * 27 + Math.floor(column / 3) * 3;
    const units: { sound: InteractionSound; cells: number[] }[] = [
      { sound: 'row', cells: DIGITS.map(digit => rowStart + digit - 1) },
      { sound: 'column', cells: DIGITS.map(digit => (digit - 1) * 9 + column) },
      { sound: 'box', cells: DIGITS.map(digit => boxStart + Math.floor((digit - 1) / 3) * 9 + (digit - 1) % 3) },
    ];
    const completed = units.filter(({ cells }) =>
      cells.every(cell => values[cell] === puzzle.solution[cell]) &&
      !cells.every(cell => previous[cell] === puzzle.solution[cell]));
    setCompletedCells([...new Set(completed.flatMap(({ cells }) => cells))]);
    playSound(completed[0]?.sound ?? 'correct');
  }

  function enter(selected: number, digit: number) {
    const previous = current.current;
    if (paused || previous.mistakes >= MAX_LIVES) return false;
    if (isDigitComplete(digit, previous.values)) return false;
    if (previous.completed || puzzle.givens[selected] || previous.values[selected] === puzzle.solution[selected]) return false;
    if (pencil) {
      const notes = previous.notes.map((cell, index) => index !== selected ? cell : cell.includes(digit) ? cell.filter(value => value !== digit) : [...cell, digit].sort());
      commit(previous.values, notes);
      playSound('note');
      return true;
    }
    const wrong = digit !== puzzle.solution[selected];
    const values = previous.values.map((value, index) => index === selected ? digit : value);
    const notes = wrong ? previous.notes : clearNotesForEntry(previous.notes, selected, digit);
    commit(values, notes, { mistakes: previous.mistakes + Number(wrong) });
    if (wrong) playSound('error');
    else showAnswerFeedback(selected, previous.values, values);
    return true;
  }

  function hint() {
    if (paused || current.current.completed || current.current.mistakes >= MAX_LIVES) return;
    setPromptCell(null);
    clearMistakes();
    const previous = current.current;
    const index = !puzzle.givens[selected] && previous.values[selected] !== puzzle.solution[selected] ? selected : previous.values.findIndex((value, i) => value !== puzzle.solution[i]);
    if (index < 0) return;
    const digit = puzzle.solution[index];
    const values = previous.values.map((value, i) => i === index ? digit : value);
    const notes = clearNotesForEntry(previous.notes, index, digit);
    setSelected(index);
    setPencil(false);
    commit(values, notes, { hints: previous.hints + 1 });
    showAnswerFeedback(index, previous.values, values);
  }

  const title = puzzle.mode === 'daily' ? 'Daily puzzle' : `Level ${puzzle.level}`;

  return <>
    <Stack.Screen options={{ title }} />
    <View testID="game-content" style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), gap: 12 }}>
      <SaveNotice />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 10, borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }}>
        <View style={{ gap: 5, flex: 1 }}>
          <ThemedText themeColor="primary" type="smallBold" style={{ textTransform: 'capitalize' }}>{puzzle.difficulty}</ThemedText>
          <View accessible accessibilityLabel={`${lives} of ${MAX_LIVES} lives remaining`} accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <ThemedText themeColor="error" style={{ fontSize: 18, letterSpacing: 2 }}>{'♥'.repeat(lives)}{'♡'.repeat(MAX_LIVES - lives)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>{lives}/{MAX_LIVES} lives</ThemedText>
          </View>
        </View>
        <GameTimer
          key={failed ? 'failed' : 'playing'}
          getSession={getSession}
          initialElapsed={session.elapsed}
          onTick={recordElapsed}
          paused={paused}
          puzzleId={puzzle.id}
        />
      </View>
      <View testID="board-space" onLayout={({ nativeEvent: { layout } }) => setBoardSize(Math.floor(Math.min(layout.width, layout.height)))}
        style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        {boardSize > 0 ? <SudokuBoard size={boardSize} promptCell={promptCell} puzzle={puzzle} values={session.values} notes={session.notes} selected={selected} selectedDigit={selectedDigit} onSelect={select} completed={session.completed} completedCells={completedCells} disabled={paused} /> : null}
      </View>
      <View style={{ gap: 8 }}>
        {[DIGITS.slice(0, 5), DIGITS.slice(5)].map((row, index) => (
          <View key={index} style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {row.map(digit => {
              const allPlaced = isDigitComplete(digit, session.values);
              const active = selectedDigit === digit;
              const disabled = paused || session.completed || allPlaced;
              const accessibilityHint = active
                ? 'Tap again to deselect this number'
                : pencil
                  ? 'Select this note, then tap a cell to add or remove it'
                  : 'Select this number, then tap a cell to place it';

              return (
                <Pressable
                  key={digit}
                  disabled={disabled}
                  onPress={() => selectDigit(digit)}
                  testID={`digit-${digit}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Number ${digit}${allPlaced ? ', all placed' : ''}`}
                  accessibilityHint={accessibilityHint}
                  aria-pressed={active}
                  accessibilityState={{ selected: active, disabled }}
                  style={{ width: numberSize, height: numberSize, borderRadius: 16 }}
                >
                  {({ pressed }) => (
                    <Animated.View style={{
                      flex: 1,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderStyle: pencil ? 'dashed' : 'solid',
                      borderColor: active || pencil ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primary : theme.backgroundElement,
                      opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
                      transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }],
                      transitionProperty: ['backgroundColor', 'borderColor', 'opacity', 'transform'],
                      transitionDuration: 120,
                      transitionTimingFunction: feedbackEasing,
                    }}>
                      <Animated.Text
                        maxFontSizeMultiplier={1.25}
                        style={{
                          fontSize: 23,
                          lineHeight: 28,
                          fontWeight: '600',
                          color: active ? theme.primaryText : theme.primary,
                          transitionProperty: 'color',
                          transitionDuration: 120,
                          transitionTimingFunction: feedbackEasing,
                        }}
                      >
                        {String(digit)}
                      </Animated.Text>
                    </Animated.View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ThemedText type="smallBold">Notes</ThemedText>
        <View style={{ width: 88, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={() => { playSound(); setPencil(value => !value); }} disabled={paused || session.completed} accessibilityRole="switch" accessibilityLabel="Notes mode" testID="notes-toggle"
            aria-checked={pencil} accessibilityState={{ checked: pencil, disabled: paused || session.completed }}
            style={{ width: 88, height: 48, borderRadius: 24 }}>
            {({ pressed }) => <Animated.View style={{ flex: 1, padding: 4, borderRadius: 24, backgroundColor: pencil ? theme.primary : theme.border, opacity: paused || session.completed ? 0.5 : pressed ? 0.75 : 1, transitionProperty: ['backgroundColor', 'opacity'], transitionDuration: [180, 120], transitionTimingFunction: feedbackEasing }}>
              <Animated.View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundElement, transform: [{ translateX: pencil ? 40 : 0 }], transitionProperty: 'transform', transitionDuration: reducedMotion ? 0 : 180, transitionTimingFunction: feedbackEasing }}>
                <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={22} tintColor={theme.primary} accessible={false} />
              </Animated.View>
            </Animated.View>}
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          {session.completed ? <GameButton label="Complete ✓" onPress={() => setSheet('complete')} /> : <NativeButton label="Hint" disabled={paused} onPress={hint} backgroundColor={theme.backgroundSelected} />}
        </View>
      </View>
    </View>
    <Host>
      <BottomSheet isPresented={sheet !== null} onDismiss={dismissSheet} containerColor={theme.background} contentPadding={0} snapPoints={['full']}>
        <ScrollView style={{ width: '100%', height: Math.round(height * 0.85) }} contentContainerStyle={{ gap: 20, padding: 24, paddingBottom: 48 }}>
          <ThemedText accessibilityRole="header" style={{ fontFamily: Fonts.rounded, fontSize: 34, lineHeight: 40, fontWeight: '700' }}>{sheet === 'failed' ? 'Time for a fresh start.' : 'Everything in its place.'}</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontWeight: '400' }}>{sheet === 'failed' ? `You used all ${MAX_LIVES} lives. Restart this puzzle with a fresh board and ${MAX_LIVES} lives, or return to the menu.` : `You solved ${title.toLowerCase()} in ${formatTime(session.elapsed)}, with ${session.hints} hints.`}</ThemedText>
          {sheet === 'failed' ? <>
            <GameButton label="Restart puzzle" onPress={restart} />
            <GameButton secondary label="Back to menu" onPress={goToMenu} />
          </> : null}
          {sheet === 'complete' && puzzle.mode === 'adventure' && puzzle.level < LEVEL_COUNT ? <GameButton label={`On to level ${puzzle.level + 1}  →`} onPress={() => { setSheet(null); router.replace({ pathname: '/sudoku/[id]', params: { id: levelId(puzzle.level + 1) } }); }} /> : null}
          {sheet === 'complete' && puzzle.mode === 'adventure' && puzzle.level === LEVEL_COUNT ? <ThemedText themeColor="primary">You’ve reached the summit. All 24 levels complete.</ThemedText> : null}
          {sheet === 'complete' ? <GameButton label="View my puzzle" onPress={() => setSheet(null)} secondary /> : null}
          {sheet === 'complete' ? <GameButton secondary label={puzzle.mode === 'adventure' ? 'Back to the trail' : 'Back to Sudoku'} onPress={goToMenu} /> : null}
        </ScrollView>
      </BottomSheet>
    </Host>
  </>;
}
