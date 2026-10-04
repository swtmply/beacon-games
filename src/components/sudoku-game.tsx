import { BottomSheet, Host } from '@expo/ui';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState, type RefObject } from 'react';
import { AppState, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { Eyebrow, GameButton, GamePage, NativeButton, SaveNotice } from '@/components/game-ui';
import { SudokuBoard } from '@/components/sudoku-board';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { newSession, useGames, useGamesStatus, type Session } from '@/hooks/use-games';
import { useInteractionSound, type InteractionSound } from '@/hooks/use-interaction-sound';
import { useTheme } from '@/hooks/use-theme';
import { arePeers, chapterFor, DIGITS, formatTime, LEVEL_COUNT, levelId, type Puzzle } from '@/utils/sudoku';

const MAX_LIVES = 5;
const feedbackEasing = cubicBezier(0.23, 1, 0.32, 1);

function GameTimer({ current, initialElapsed, paused, puzzleId }: {
  current: RefObject<Session>; initialElapsed: number; paused: boolean; puzzleId: string;
}) {
  const { save } = useGamesStatus();
  const [elapsed, setElapsed] = useState(initialElapsed);

  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      const latest = current.current;
      if (paused || latest.completed || latest.mistakes >= MAX_LIVES || AppState.currentState !== 'active') return;
      const next = { ...latest, elapsed: latest.elapsed + 1 };
      current.current = next;
      setElapsed(next.elapsed);
      if (next.elapsed % 10 === 0) save(puzzleId, next);
    }, 1000);
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') save(puzzleId, current.current);
    });
    return () => { clearInterval(timer); listener.remove(); save(puzzleId, current.current); };
  }, [current, paused, puzzleId, save]));

  return <View style={{ alignItems: 'flex-end', gap: 2 }}>
    <ThemedText selectable style={{ fontSize: 24, fontWeight: '400', fontVariant: ['tabular-nums'] }}>{formatTime(elapsed)}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>your time</ThemedText>
  </View>;
}

export function SudokuGame({ puzzle }: { puzzle: Puzzle }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const playSound = useInteractionSound();
  const { height, width } = useWindowDimensions();
  const { sessions, save } = useGames();
  const [session, setSession] = useState(() => sessions[puzzle.id] ?? newSession(puzzle));
  const current = useRef(session);
  const [selected, setSelected] = useState(() => Math.max(0, puzzle.givens.indexOf(0)));
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [pencil, setPencil] = useState(false);
  const lives = Math.max(0, MAX_LIVES - session.mistakes);
  const failed = lives === 0 && !session.completed;
  const [sheet, setSheet] = useState<'complete' | 'failed' | null>(() => failed ? 'failed' : null);
  const paused = failed || sheet !== null;
  const numberSize = Math.min(58, (width - 40 - 32) / 5);

  function isDigitComplete(digit: number, values: number[]) {
    return values.filter(value => value === digit).length >= 9;
  }

  function select(index: number) {
    if (paused || current.current.mistakes >= MAX_LIVES) return;
    clearMistakes();
    setSelected(index);
    if (selectedDigit === null || !enter(index, selectedDigit)) playSound();
  }

  function selectDigit(digit: number) {
    if (paused || current.current.completed || current.current.mistakes >= MAX_LIVES || isDigitComplete(digit, current.current.values)) return;
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
    const next = { ...previous, values, notes, ...extra, completed };
    update(next);
    if (selectedDigit !== null && isDigitComplete(selectedDigit, values)) setSelectedDigit(null);
    if (completed) setSheet('complete');
    else if (next.mistakes >= MAX_LIVES) setSheet('failed');
  }

  function restart() {
    update(newSession(puzzle));
    setSelected(Math.max(0, puzzle.givens.indexOf(0)));
    setSelectedDigit(null);
    setPencil(false);
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
    if (values.some((value, index) => value !== previous.values[index])) update({ ...previous, values });
  }

  function playAnswerSound(index: number, previous: number[], values: number[]) {
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
    playSound('correct', ...completed.map(({ sound }) => sound));
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
    const notes = previous.notes.map((cell, index) => {
      if (wrong) return cell;
      if (index === selected) return cell.length ? [] : cell;
      return arePeers(selected, index) && cell.includes(digit) ? cell.filter(value => value !== digit) : cell;
    });
    commit(values, notes, { mistakes: previous.mistakes + Number(wrong) });
    if (wrong) playSound('error');
    else playAnswerSound(selected, previous.values, values);
    return true;
  }

  function hint() {
    if (paused || current.current.completed || current.current.mistakes >= MAX_LIVES) return;
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
    playAnswerSound(index, previous.values, values);
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
          <View accessible accessibilityLabel={`${lives} of ${MAX_LIVES} lives remaining`} accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <ThemedText themeColor="error" style={{ fontSize: 18, letterSpacing: 2 }}>{'♥'.repeat(lives)}{'♡'.repeat(MAX_LIVES - lives)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>{lives}/{MAX_LIVES} lives</ThemedText>
          </View>
        </View>
        <GameTimer key={failed ? 'failed' : 'playing'} current={current} initialElapsed={session.elapsed} paused={paused} puzzleId={puzzle.id} />
      </View>
      <SudokuBoard puzzle={puzzle} values={session.values} notes={session.notes} selected={selected} selectedDigit={selectedDigit} onSelect={select} completed={session.completed} disabled={paused} />
      <View style={{ gap: 10 }}>
        {[DIGITS.slice(0, 5), DIGITS.slice(5)].map((row, index) => <View key={index} style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {row.map(digit => {
            const disabled = paused || session.completed || isDigitComplete(digit, session.values);
            return <Pressable key={digit} disabled={disabled} onPress={() => selectDigit(digit)} testID={`digit-${digit}`}
              accessibilityRole="button" accessibilityLabel={`Number ${digit}`} accessibilityHint={pencil ? 'Select this note, then tap a cell to add or remove it' : 'Select this number, then tap a cell to place it'}
              accessibilityState={{ selected: selectedDigit === digit, disabled }}
              style={{ width: numberSize, height: numberSize, borderRadius: numberSize / 2 }}>
              {({ pressed }) => <Animated.View style={{ flex: 1, borderRadius: numberSize / 2, borderCurve: 'circular', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: pencil ? 'dashed' : 'solid', borderColor: pencil ? selectedDigit === digit ? theme.primaryText : theme.primary : 'transparent', backgroundColor: selectedDigit === digit ? theme.primary : theme.backgroundSelected, opacity: disabled ? 0.5 : pressed ? 0.75 : 1, transitionProperty: ['backgroundColor', 'borderColor', 'opacity'], transitionDuration: 120, transitionTimingFunction: feedbackEasing }}>
                <Animated.Text maxFontSizeMultiplier={1.25} style={{ fontSize: 23, lineHeight: 28, fontWeight: '600', color: selectedDigit === digit ? theme.primaryText : theme.primary, transitionProperty: 'color', transitionDuration: 120, transitionTimingFunction: feedbackEasing }}>{String(digit)}</Animated.Text>
              </Animated.View>}
            </Pressable>;
          })}
        </View>)}
      </View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <ThemedText type="smallBold" themeColor="primary">Notes</ThemedText>
        <View style={{ width: 88, height: 56, alignItems: 'center', justifyContent: 'center' }}>
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
        <View style={{ width: '30%', maxWidth: 110 }}><NativeButton label="Hint" fontSize={12} disabled={paused || session.completed} onPress={hint} backgroundColor={theme.backgroundElement} /></View>
      </View>
      {session.completed ? <GameButton label="Puzzle complete  ✓" onPress={() => setSheet('complete')} /> : null}
    </GamePage>
    <Host>
      <BottomSheet isPresented={sheet !== null} onDismiss={dismissSheet} containerColor={theme.background} contentPadding={0} snapPoints={['full']}>
        <ScrollView style={{ width: '100%', height: Math.round(height * 0.85) }} contentContainerStyle={{ gap: 20, padding: 24, paddingBottom: 48 }}>
          <Eyebrow>{sheet === 'failed' ? 'Out of lives' : 'A little victory'}</Eyebrow>
          <ThemedText style={{ fontFamily: Fonts.serif, fontSize: 34, lineHeight: 40, fontWeight: '400' }}>{sheet === 'failed' ? 'Time for a fresh start.' : 'Everything in its place.'}</ThemedText>
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
