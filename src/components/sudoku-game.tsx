import { BottomSheet, Host } from '@expo/ui';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useCallback, useRef, useState } from 'react';
import { AppState, ScrollView, useWindowDimensions, View } from 'react-native';

import { Eyebrow, GameButton, GamePage, NativeButton, SaveNotice } from '@/components/game-ui';
import { SudokuBoard } from '@/components/sudoku-board';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { newSession, useGames, type Session } from '@/hooks/use-games';
import { useTheme } from '@/hooks/use-theme';
import { arePeers, chapterFor, DIGITS, formatTime, LEVEL_COUNT, levelId, type Puzzle } from '@/utils/sudoku';

type Move = Pick<Session, 'values' | 'notes'>;

export function SudokuGame({ puzzle }: { puzzle: Puzzle }) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const { sessions, save } = useGames();
  const [session, setSession] = useState(() => sessions[puzzle.id] ?? newSession(puzzle));
  const current = useRef(session);
  const [selected, setSelected] = useState(() => Math.max(0, puzzle.givens.indexOf(0)));
  const selection = useRef(selected);
  const [pencil, setPencil] = useState(false);
  const pencilMode = useRef(false);
  const [history, setHistory] = useState<Move[]>([]);
  const [sheet, setSheet] = useState<'help' | 'pause' | 'complete' | null>(null);
  const [message, setMessage] = useState(session.completed ? 'Every number in its place. Beautifully done.' : 'Tap a cell, then choose a number.');
  const paused = sheet !== null;

  function select(index: number) {
    selection.current = index;
    setSelected(index);
  }

  function togglePencil() {
    const next = !pencilMode.current;
    pencilMode.current = next;
    setPencil(next);
    setMessage(next ? 'Pencil mode. Add your possibilities.' : 'Number mode. Choose your answer.');
  }

  const update = useCallback((next: Session, persist = true) => {
    current.current = next;
    setSession(next);
    if (persist) save(puzzle.id, next);
  }, [puzzle.id, save]);

  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      const latest = current.current;
      if (paused || latest.completed || AppState.currentState !== 'active') return;
      const next = { ...latest, elapsed: latest.elapsed + 1 };
      update(next, next.elapsed % 10 === 0);
    }, 1000);
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') save(puzzle.id, current.current);
    });
    return () => { clearInterval(timer); listener.remove(); save(puzzle.id, current.current); };
  }, [paused, puzzle.id, save, update]));

  function commit(values: number[], notes: number[][], extra: Partial<Pick<Session, 'mistakes' | 'hints'>> = {}) {
    const previous = current.current;
    setHistory(moves => [...moves.slice(-29), { values: previous.values, notes: previous.notes }]);
    const completed = values.every((value, index) => value === puzzle.solution[index]);
    update({ ...previous, values, notes, ...extra, completed });
    if (completed) { setMessage('Every number in its place. Beautifully done.'); setSheet('complete'); }
  }

  function enter(digit: number) {
    const previous = current.current;
    const selected = selection.current;
    if (previous.completed) return;
    if (puzzle.givens[selected]) { setMessage('This number is a clue. Choose an empty cell.'); return; }
    if (pencilMode.current) {
      if (previous.values[selected]) { setMessage('Erase the number first to add pencil notes.'); return; }
      const notes = previous.notes.map((cell, index) => index !== selected ? cell : cell.includes(digit) ? cell.filter(value => value !== digit) : [...cell, digit].sort());
      commit(previous.values, notes);
      setMessage('Pencil notes are possibilities, not answers.');
      return;
    }
    if (previous.values[selected] === digit) return;
    const wrong = digit !== puzzle.solution[selected];
    const values = previous.values.map((value, index) => index === selected ? digit : value);
    const notes = previous.notes.map((cell, index) => index === selected ? [] : !wrong && arePeers(selected, index) ? cell.filter(value => value !== digit) : cell);
    setMessage(wrong ? 'That number is not quite right. Try another.' : 'Nice. Keep following the clues.');
    commit(values, notes, { mistakes: previous.mistakes + Number(wrong) });
  }

  function erase() {
    const previous = current.current;
    const selected = selection.current;
    if (previous.completed || puzzle.givens[selected]) return;
    if (!previous.values[selected] && !previous.notes[selected].length) return;
    commit(previous.values.map((value, index) => index === selected ? 0 : value), previous.notes.map((cell, index) => index === selected ? [] : cell));
    setMessage('A clean slate for this cell.');
  }

  function undo() {
    if (!history.length || current.current.completed) return;
    const move = history[history.length - 1];
    update({ ...current.current, ...move });
    setHistory(moves => moves.slice(0, -1));
    setMessage('Last move undone.');
  }

  function hint() {
    const previous = current.current;
    const selected = selection.current;
    if (previous.completed) return;
    const index = !puzzle.givens[selected] && previous.values[selected] !== puzzle.solution[selected] ? selected : previous.values.findIndex((value, i) => value !== puzzle.solution[i]);
    if (index < 0) return;
    const digit = puzzle.solution[index];
    const values = previous.values.map((value, i) => i === index ? digit : value);
    const notes = previous.notes.map((cell, i) => i === index ? [] : arePeers(index, i) ? cell.filter(value => value !== digit) : cell);
    select(index);
    pencilMode.current = false;
    setPencil(false);
    setMessage(`A little help: row ${Math.floor(index / 9) + 1}, column ${index % 9 + 1} is ${digit}.`);
    commit(values, notes, { hints: previous.hints + 1 });
  }

  const title = puzzle.mode === 'daily' ? 'Daily puzzle' : `Level ${puzzle.level}`;
  const filled = session.values.filter((value, i) => !puzzle.givens[i] && value === puzzle.solution[i]).length;
  const emptyCount = puzzle.givens.filter(value => !value).length;
  const subtitle = puzzle.mode === 'daily' ? new Date(`${puzzle.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : chapterFor(puzzle.level).name;
  const tools = [
    { label: 'Undo', disabled: !history.length || session.completed },
    { label: 'Erase', disabled: Boolean(puzzle.givens[selected]) || session.completed },
    { label: pencil ? 'Notes on' : 'Notes', disabled: session.completed },
    { label: 'Hint', disabled: session.completed },
  ];

  return <>
    <Stack.Screen options={{ title }} />
    <GamePage contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 18 }}>
      <SaveNotice />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 5, flex: 1 }}>
          <Eyebrow>{subtitle}</Eyebrow>
          <ThemedText themeColor="primary" type="smallBold">{puzzle.difficulty} · {filled}/{emptyCount} filled</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <ThemedText selectable style={{ fontSize: 24, fontWeight: '400', fontVariant: ['tabular-nums'] }}>{formatTime(session.elapsed)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>your time</ThemedText>
        </View>
      </View>
      <View style={{ position: 'relative' }}>
        <SudokuBoard puzzle={puzzle} values={session.values} notes={session.notes} selected={selected} onSelect={select} completed={session.completed} />
        {sheet === 'pause' ? <View style={{ position: 'absolute', inset: 0, backgroundColor: theme.backgroundSelected, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ fontFamily: Fonts.serif, fontSize: 32 }}>Take a breather.</ThemedText></View> : null}
      </View>
      <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="textSecondary" style={{ textAlign: 'center', minHeight: 36, fontWeight: '400' }}>{message}</ThemedText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {tools.map((tool, index) => <View key={index} style={{ flex: 1 }}>
            <NativeButton label={tool.label} fontSize={12} disabled={tool.disabled} onPress={() => {
              if (index === 0) undo();
              else if (index === 1) erase();
              else if (index === 3) hint();
              else togglePencil();
            }} color={tool.disabled ? theme.textSecondary : theme.primary} backgroundColor={tool.label === 'Notes on' ? theme.backgroundSelected : theme.backgroundElement} />
        </View>)}
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {DIGITS.map(digit => {
          const remaining = Math.max(0, 9 - session.values.filter((value, index) => value === digit && value === puzzle.solution[index]).length);
          return <View key={digit} style={{ flex: 1, gap: 2, alignItems: 'center' }}>
            <NativeButton label={String(digit)} height={58} fontSize={23} disabled={session.completed || remaining === 0} onPress={() => enter(digit)} testID={`digit-${digit}`} color={remaining ? theme.primary : theme.textSecondary} backgroundColor={theme.backgroundSelected} />
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 10 }}>{String(remaining)}</ThemedText>
          </View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{session.mistakes} mistakes · {session.hints} hints</ThemedText>
        <View style={{ width: 110 }}><NativeButton fontSize={12} label="Rules" onPress={() => setSheet('help')} /></View>
      </View>
      {session.completed ? <GameButton label="Puzzle complete  ✓" onPress={() => setSheet('complete')} /> : <GameButton secondary label="Pause game" onPress={() => setSheet('pause')} />}
    </GamePage>
    <Host>
      <BottomSheet isPresented={sheet !== null} onDismiss={() => setSheet(null)} containerColor={theme.background} contentPadding={0} snapPoints={['full']}>
        <ScrollView style={{ width: '100%', height: Math.round(height * 0.85) }} contentContainerStyle={{ gap: 20, padding: 24, paddingBottom: 48 }}>
          <Eyebrow>{sheet === 'complete' ? 'A little victory' : sheet === 'pause' ? 'No rush' : 'The rules are simple'}</Eyebrow>
          <ThemedText style={{ fontFamily: Fonts.serif, fontSize: 34, lineHeight: 40, fontWeight: '400' }}>{sheet === 'complete' ? 'Everything in its place.' : sheet === 'pause' ? 'Take a breather.' : 'Nine numbers. One rule.'}</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontWeight: '400' }}>{sheet === 'complete' ? `You solved ${title.toLowerCase()} in ${formatTime(session.elapsed)}, with ${session.mistakes} mistakes and ${session.hints} hints.` : sheet === 'pause' ? 'Your timer is paused. Pick up where you left off when you’re ready.' : 'Fill each row, column, and 3 × 3 box with the numbers 1–9, using each number once. The darker numbers are clues and stay in place. Tap a cell, then a number. Use Notes for possibilities, Undo to retrace a move, or Hint for a little help.'}</ThemedText>
          {sheet === 'complete' && puzzle.mode === 'adventure' && puzzle.level < LEVEL_COUNT ? <GameButton label={`On to level ${puzzle.level + 1}  →`} onPress={() => { setSheet(null); router.replace({ pathname: '/sudoku/[id]', params: { id: levelId(puzzle.level + 1) } }); }} /> : null}
          {sheet === 'complete' && puzzle.mode === 'adventure' && puzzle.level === LEVEL_COUNT ? <ThemedText themeColor="primary">You’ve reached the summit. All 24 levels complete.</ThemedText> : null}
          <GameButton label={sheet === 'pause' ? 'Keep playing' : sheet === 'help' ? 'Got it. Let’s play.' : 'View my puzzle'} onPress={() => setSheet(null)} secondary={sheet === 'complete'} />
          {sheet === 'complete' ? <GameButton secondary label={puzzle.mode === 'adventure' ? 'Back to the trail' : 'Back to Sudoku'} onPress={() => { setSheet(null); router.replace(puzzle.mode === 'adventure' ? '/sudoku/adventure' : '/sudoku'); }} /> : null}
        </ScrollView>
      </BottomSheet>
    </Host>
  </>;
}
