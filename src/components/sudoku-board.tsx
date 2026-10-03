import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { DIGITS, type Puzzle } from '@/utils/sudoku';

export function SudokuBoard({ puzzle, values, notes, selected, selectedDigit, onSelect, completed }: {
  puzzle: Puzzle; values: number[]; notes: number[][]; selected: number; selectedDigit: number | null; onSelect: (index: number) => void; completed: boolean;
}) {
  const theme = useTheme();
  return <View style={{ width: '100%', aspectRatio: 1, backgroundColor: theme.backgroundElement, borderWidth: 2, borderColor: theme.primary, borderRadius: 10, overflow: 'hidden' }}>
    {Array.from({ length: 9 }, (_, row) => <View key={row} style={{ flex: 1, flexDirection: 'row', borderBottomWidth: row === 8 ? 0 : row % 3 === 2 ? 2 : 0.5, borderColor: row % 3 === 2 ? theme.primary : theme.border }}>
      {Array.from({ length: 9 }, (_, column) => {
        const index = row * 9 + column;
        const value = values[index];
        const given = Boolean(puzzle.givens[index]);
        const added = Boolean(value && !given);
        const wrong = Boolean(value && value !== puzzle.solution[index]);
        const matching = Boolean(value && value === selectedDigit);
        const highlighted = wrong || matching;
        const highlightColor = wrong ? theme.errorSoft : theme.accentSoft;
        const color = wrong ? theme.error : given ? theme.text : theme.primary;
        return <Pressable key={column} onPress={() => onSelect(index)} accessibilityRole="button"
          accessibilityLabel={`Row ${row + 1}, column ${column + 1}, ${value ? `${value}${given ? ', given' : wrong ? ', incorrect' : ''}` : notes[index].length ? `notes ${notes[index].join(', ')}` : 'empty'}`}
          accessibilityHint={completed ? undefined : given ? 'Choose a number below to highlight matching numbers' : 'Choose a number below, then tap this cell to enter it'}
          accessibilityState={{ selected: index === selected }} testID={`cell-${index}`}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundElement, borderRightWidth: column === 8 ? 0 : column % 3 === 2 ? 2 : 0.5, borderColor: column % 3 === 2 ? theme.primary : theme.border }}>
          {highlighted ? <View pointerEvents="none" style={{ position: 'absolute', width: '88%', aspectRatio: 1, borderRadius: added ? 100 : 10, borderCurve: added ? 'circular' : 'continuous', backgroundColor: highlightColor }} /> : null}
          {value ? <ThemedText maxFontSizeMultiplier={1.25} style={{ fontSize: 24, lineHeight: 30, fontWeight: given ? '600' : '400', color }}>{String(value)}</ThemedText> :
            <View style={{ width: '90%', height: '90%', flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' }}>
              {DIGITS.map(digit => <ThemedText key={digit} maxFontSizeMultiplier={1.15} style={{ width: '33.333%', height: '33.333%', fontSize: 9, lineHeight: 12, textAlign: 'center', color: theme.textSecondary }}>{notes[index].includes(digit) ? String(digit) : ''}</ThemedText>)}
            </View>}
        </Pressable>;
      })}
    </View>)}
  </View>;
}
