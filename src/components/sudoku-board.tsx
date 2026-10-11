import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { cubicBezier, Easing, FadeIn, FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { arePeers, type Puzzle } from '@/utils/sudoku';

const feedbackEasing = cubicBezier(0.23, 1, 0.32, 1);
const fadeIn = FadeIn.duration(120).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System);
const fadeOut = FadeOut.duration(120).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System);
const completionPulse = { from: { opacity: 0 }, '30%': { opacity: 0.12 }, to: { opacity: 0 } };

const SudokuCellContents = memo(function SudokuCellContents({ value, notes, given, wrong, matching, selectedDigit, cellSize }: {
  value: number; notes: number[]; given: boolean; wrong: boolean; matching: boolean; selectedDigit: number | null; cellSize: number;
}) {
  const theme = useTheme();
  const added = Boolean(value && !given);
  const color = wrong ? theme.error : given ? theme.text : theme.primary;
  const fontSize = Math.min(24, cellSize * 0.6);
  const noteSize = Math.min(9, cellSize * 0.24);
  return <>
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: '88%', aspectRatio: 1, borderRadius: added ? 100 : 10, borderCurve: added ? 'circular' : 'continuous', backgroundColor: wrong ? theme.errorSoft : theme.accentSoft, opacity: wrong || matching ? 1 : 0, transitionProperty: ['opacity', 'backgroundColor'], transitionDuration: 120, transitionTimingFunction: feedbackEasing }} />
    {value ? <Animated.View key={value} entering={given ? undefined : fadeIn}>
      <ThemedText maxFontSizeMultiplier={1.25} style={{ fontSize, lineHeight: fontSize * 1.25, fontWeight: given ? '600' : '400', color }}>{String(value)}</ThemedText>
    </Animated.View> :
      <View pointerEvents="none" style={{ width: '90%', height: '90%' }}>
        {notes.map(digit => <Animated.View key={digit} entering={fadeIn} exiting={fadeOut} style={{ position: 'absolute', left: `${(digit - 1) % 3 * 100 / 3}%`, top: `${Math.floor((digit - 1) / 3) * 100 / 3}%`, width: '33.333%', height: '33.333%' }}>
          <ThemedText maxFontSizeMultiplier={1.15} style={{ fontSize: noteSize, lineHeight: noteSize * 1.25, textAlign: 'center', fontWeight: digit === selectedDigit ? '700' : '500', color: digit === selectedDigit ? theme.primary : theme.textSecondary }}>{String(digit)}</ThemedText>
        </Animated.View>)}
      </View>}
  </>;
});

export function SudokuBoard({ puzzle, values, notes, selected, selectedDigit, onSelect, completed, completedCells, disabled, size, promptCell }: {
  puzzle: Puzzle; values: number[]; notes: number[][]; selected: number; selectedDigit: number | null; onSelect: (index: number) => void; completed: boolean; completedCells: number[]; disabled: boolean; size: number; promptCell: number | null;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const completionKey = completedCells.join(',');
  const highlightedDigit = selectedDigit ?? (values[selected] || null);
  const cellSize = (size - 4) / 9;
  const promptRow = Math.floor((promptCell ?? 0) / 9);
  const promptX = 2 + ((promptCell ?? 0) % 9 + 0.5) * cellSize;
  const promptWidth = Math.min(200, size - 16);
  const promptLeft = Math.max(8, Math.min(promptX - promptWidth / 2, size - promptWidth - 8));
  const promptBelow = promptRow < 4;

  return <View testID="sudoku-board" style={{ width: size, height: size }}>
    <View style={{ flex: 1, backgroundColor: theme.backgroundElement, borderWidth: 2, borderColor: theme.text, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' }}>
    {Array.from({ length: 9 }, (_, row) => <View key={row} style={{ flex: 1, flexDirection: 'row', borderBottomWidth: row === 8 ? 0 : row % 3 === 2 ? 2 : 0.5, borderColor: row % 3 === 2 ? theme.text : theme.border }}>
      {Array.from({ length: 9 }, (_, column) => {
        const index = row * 9 + column;
        const value = values[index];
        const given = Boolean(puzzle.givens[index]);
        const wrong = Boolean(value && value !== puzzle.solution[index]);
        const matching = Boolean(value && value === highlightedDigit);
        const active = !completed && index === selected;
        const related = !completed && arePeers(index, selected);
        return <Pressable key={column} disabled={disabled} onPress={() => onSelect(index)} accessibilityRole="button"
          accessibilityLabel={`Row ${row + 1}, column ${column + 1}, ${value ? `${value}${given ? ', given' : wrong ? ', incorrect' : ''}` : notes[index].length ? `notes ${notes[index].join(', ')}` : 'empty'}`}
          accessibilityHint={completed ? undefined : given ? 'Choose a number below to highlight matching numbers' : 'Choose a number below, then tap this cell to enter it'}
          accessibilityState={{ selected: index === selected, disabled }} testID={`cell-${index}`}
          style={{ flex: 1, borderRightWidth: column === 8 ? 0 : column % 3 === 2 ? 2 : 0.5, borderColor: column % 3 === 2 ? theme.text : theme.border }}>
          {({ pressed }) => <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed || active ? theme.backgroundSelected : related ? theme.background : theme.backgroundElement, transitionProperty: 'backgroundColor', transitionDuration: 120, transitionTimingFunction: feedbackEasing }}>
            {active ? <View pointerEvents="none" style={{ position: 'absolute', top: 1, right: 1, bottom: 1, left: 1, borderWidth: 2, borderColor: theme.primary, borderRadius: 6 }} /> : null}
            {!reducedMotion && completedCells.includes(index) ? <Animated.View key={completionKey} pointerEvents="none" accessible={false}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.primary, opacity: 0, animationName: completionPulse, animationDuration: 280, animationTimingFunction: feedbackEasing }} /> : null}
            <SudokuCellContents value={value} notes={notes[index]} given={given} wrong={wrong} matching={matching} selectedDigit={highlightedDigit} cellSize={cellSize} />
          </Animated.View>}
        </Pressable>;
      })}
    </View>)}
    </View>
    {promptCell !== null && !disabled && !completed ? <View pointerEvents="none" testID="cell-number-tooltip"
      style={{ position: 'absolute', left: promptLeft, width: promptWidth, ...(promptBelow ? { top: 2 + (promptRow + 1) * cellSize + 6 } : { bottom: size - (2 + promptRow * cellSize) + 6 }), padding: 10, borderRadius: 10, backgroundColor: theme.primary }}>
      <View style={{ position: 'absolute', left: Math.max(8, Math.min(promptX - promptLeft - 4, promptWidth - 16)), ...(promptBelow ? { top: -4 } : { bottom: -4 }), width: 8, height: 8, transform: [{ rotate: '45deg' }], backgroundColor: theme.primary }} />
      <ThemedText accessibilityLiveRegion="polite" role="status" themeColor="primaryText" type="smallBold" style={{ textAlign: 'center' }}>Select a number first</ThemedText>
    </View> : null}
  </View>;
}
