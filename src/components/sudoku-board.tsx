import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { cubicBezier, Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Puzzle } from '@/utils/sudoku';

const feedbackEasing = cubicBezier(0.23, 1, 0.32, 1);
const fadeIn = FadeIn.duration(120).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System);
const fadeOut = FadeOut.duration(120).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System);

const SudokuCellContents = memo(function SudokuCellContents({ value, notes, given, wrong, matching }: {
  value: number; notes: number[]; given: boolean; wrong: boolean; matching: boolean;
}) {
  const theme = useTheme();
  const added = Boolean(value && !given);
  const color = wrong ? theme.error : given ? theme.text : theme.primary;
  return <>
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: '88%', aspectRatio: 1, borderRadius: added ? 100 : 10, borderCurve: added ? 'circular' : 'continuous', backgroundColor: wrong ? theme.errorSoft : theme.accentSoft, opacity: wrong || matching ? 1 : 0, transitionProperty: ['opacity', 'backgroundColor'], transitionDuration: 120, transitionTimingFunction: feedbackEasing }} />
    {value ? <Animated.View key={value} entering={given ? undefined : fadeIn}>
      <ThemedText maxFontSizeMultiplier={1.25} style={{ fontSize: 24, lineHeight: 30, fontWeight: given ? '600' : '400', color }}>{String(value)}</ThemedText>
    </Animated.View> :
      <View pointerEvents="none" style={{ width: '90%', height: '90%' }}>
        {notes.map(digit => <Animated.View key={digit} entering={fadeIn} exiting={fadeOut} style={{ position: 'absolute', left: `${(digit - 1) % 3 * 100 / 3}%`, top: `${Math.floor((digit - 1) / 3) * 100 / 3}%`, width: '33.333%', height: '33.333%' }}>
          <ThemedText maxFontSizeMultiplier={1.15} style={{ fontSize: 9, lineHeight: 12, textAlign: 'center', color: theme.textSecondary }}>{String(digit)}</ThemedText>
        </Animated.View>)}
      </View>}
  </>;
});

export function SudokuBoard({ puzzle, values, notes, selected, selectedDigit, onSelect, completed, disabled }: {
  puzzle: Puzzle; values: number[]; notes: number[][]; selected: number; selectedDigit: number | null; onSelect: (index: number) => void; completed: boolean; disabled: boolean;
}) {
  const theme = useTheme();
  return <View style={{ width: '100%', aspectRatio: 1, backgroundColor: theme.backgroundElement, borderWidth: 2, borderColor: theme.primary, borderRadius: 10, overflow: 'hidden' }}>
    {Array.from({ length: 9 }, (_, row) => <View key={row} style={{ flex: 1, flexDirection: 'row', borderBottomWidth: row === 8 ? 0 : row % 3 === 2 ? 2 : 0.5, borderColor: row % 3 === 2 ? theme.primary : theme.border }}>
      {Array.from({ length: 9 }, (_, column) => {
        const index = row * 9 + column;
        const value = values[index];
        const given = Boolean(puzzle.givens[index]);
        const wrong = Boolean(value && value !== puzzle.solution[index]);
        const matching = Boolean(value && value === selectedDigit);
        return <Pressable key={column} disabled={disabled} onPress={() => onSelect(index)} accessibilityRole="button"
          accessibilityLabel={`Row ${row + 1}, column ${column + 1}, ${value ? `${value}${given ? ', given' : wrong ? ', incorrect' : ''}` : notes[index].length ? `notes ${notes[index].join(', ')}` : 'empty'}`}
          accessibilityHint={completed ? undefined : given ? 'Choose a number below to highlight matching numbers' : 'Choose a number below, then tap this cell to enter it'}
          accessibilityState={{ selected: index === selected, disabled }} testID={`cell-${index}`}
          style={{ flex: 1, borderRightWidth: column === 8 ? 0 : column % 3 === 2 ? 2 : 0.5, borderColor: column % 3 === 2 ? theme.primary : theme.border }}>
          {({ pressed }) => <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, transitionProperty: 'backgroundColor', transitionDuration: 120, transitionTimingFunction: feedbackEasing }}>
            <SudokuCellContents value={value} notes={notes[index]} given={given} wrong={wrong} matching={matching} />
          </Animated.View>}
        </Pressable>;
      })}
    </View>)}
  </View>;
}
