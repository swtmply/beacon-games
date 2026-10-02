import puzzlePack from '@/data/sudoku.json';

export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const LEVEL_COUNT = puzzlePack.length;
export const CHAPTERS = [
  { name: 'First light', description: 'Find your footing.', difficulty: 'Beginner' },
  { name: 'Into the grove', description: 'Look a little closer.', difficulty: 'Easy' },
  { name: 'The uphill trail', description: 'Follow the possibilities.', difficulty: 'Medium' },
  { name: 'At the summit', description: 'Make every number count.', difficulty: 'Hard' },
];

type PuzzleBoard = { id: string; givens: number[]; solution: number[]; difficulty: string };
export type Puzzle = PuzzleBoard & (
  | { mode: 'daily'; date: string }
  | { mode: 'adventure'; level: number }
);

export function arePeers(a: number, b: number) {
  return Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 ||
    (Math.floor(a / 27) === Math.floor(b / 27) && Math.floor(a % 9 / 3) === Math.floor(b % 9 / 3));
}

export function candidates(values: number[], index: number) {
  return DIGITS.filter(digit => !values.some((value, peer) => peer !== index && value === digit && arePeers(index, peer)));
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dailyId(date = localDate()) {
  return `daily-${date}`;
}

export function levelId(level: number) {
  return `level-${level}`;
}

export function chapterFor(level: number) {
  return CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor((level - 1) / 6))];
}

export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(values: T[], random: () => number) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getPuzzle(id: string): Puzzle | null {
  const levelMatch = /^level-([1-9]\d*)$/.exec(id);
  if (levelMatch) {
    const level = Number(levelMatch[1]);
    const entry = puzzlePack[level - 1];
    if (!entry) return null;
    return {
      id, mode: 'adventure', level, difficulty: chapterFor(level).difficulty,
      givens: [...entry.givens].map(Number), solution: [...entry.solution].map(Number),
    };
  }

  const dateMatch = /^daily-(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!dateMatch) return null;
  const date = dateMatch[1];
  const parsed = new Date(`${date}T12:00:00`);
  if (!Number.isFinite(parsed.getTime()) || localDate(parsed) !== date) return null;
  const random = seededRandom([...date].reduce((seed, char) => Math.imul(seed, 31) + char.charCodeAt(0) | 0, 0));
  const level = 7 + Math.floor(random() * 12);
  const entry = puzzlePack[level - 1];
  const digits = shuffle(DIGITS, random);
  const order = () => shuffle([0, 1, 2], random).flatMap(group => shuffle([0, 1, 2], random).map(offset => group * 3 + offset));
  const rows = order();
  const columns = order();
  const transpose = random() > 0.5;
  const transform = (board: string) => Array.from({ length: 81 }, (_, i) => {
    const row = rows[Math.floor(i / 9)];
    const column = columns[i % 9];
    const value = Number(board[transpose ? column * 9 + row : row * 9 + column]);
    return value ? digits[value - 1] : 0;
  });
  return { id, mode: 'daily', date, difficulty: chapterFor(level).difficulty, givens: transform(entry.givens), solution: transform(entry.solution) };
}

export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
