import { router, useLocalSearchParams } from 'expo-router';

import { GameButton, GamePage } from '@/components/game-ui';
import { SudokuGame } from '@/components/sudoku-game';
import { ThemedText } from '@/components/themed-text';
import { useGamesStatus } from '@/hooks/use-games';
import { getPuzzle } from '@/utils/sudoku';

export default function PuzzleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { unlocked } = useGamesStatus();
  const puzzle = typeof id === 'string' ? getPuzzle(id) : null;
  if (!puzzle || (puzzle.mode === 'adventure' && puzzle.level > unlocked)) return <GamePage>
    <ThemedText type="subtitle">{puzzle ? 'One step at a time.' : 'Puzzle not found.'}</ThemedText>
    <ThemedText themeColor="textSecondary">{puzzle ? 'Complete the previous level to unlock this one.' : 'Choose a daily puzzle or an adventure level to get started.'}</ThemedText>
    <GameButton label="Back to Sudoku" onPress={() => router.replace('/sudoku')} />
  </GamePage>;
  return <SudokuGame key={puzzle.id} puzzle={puzzle} />;
}
