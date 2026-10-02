import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { getPuzzle, LEVEL_COUNT, levelId, type Puzzle } from '@/utils/sudoku';

export type Session = {
  values: number[];
  notes: number[][];
  elapsed: number;
  mistakes: number;
  hints: number;
  completed: boolean;
};
type Sessions = Record<string, Session>;
const STORAGE_KEY = 'beacon:sudoku:v1';

export function newSession(puzzle: Puzzle): Session {
  return { values: [...puzzle.givens], notes: Array.from({ length: 81 }, () => []), elapsed: 0, mistakes: 0, hints: 0, completed: false };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDigits(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 81 && value.every(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9);
}

function isSession(value: unknown, puzzle: Puzzle): value is Session {
  if (!isObject(value) || !isDigits(value.values) || !Array.isArray(value.notes) || value.notes.length !== 81) return false;
  const values = value.values;
  return value.notes.every(notes => Array.isArray(notes) && notes.every(digit => Number.isInteger(digit) && digit >= 1 && digit <= 9)) &&
    ['elapsed', 'mistakes', 'hints'].every(key => typeof value[key] === 'number' && Number.isSafeInteger(value[key]) && value[key] >= 0) &&
    typeof value.completed === 'boolean' &&
    puzzle.givens.every((given, index) => !given || values[index] === given) &&
    (!value.completed || values.every((digit, index) => digit === puzzle.solution[index]));
}

function parseSessions(raw: string | null): Sessions {
  if (!raw) return {};
  const data: unknown = JSON.parse(raw);
  if (!isObject(data)) throw new Error('Saved progress could not be read.');
  const sessions: Sessions = {};
  for (const [id, value] of Object.entries(data)) {
    const puzzle = getPuzzle(id);
    if (!puzzle || !isSession(value, puzzle)) throw new Error('Saved progress could not be read.');
    sessions[id] = value;
  }
  return sessions;
}

function unlockedLevel(sessions: Sessions) {
  let level = 1;
  while (level < LEVEL_COUNT && sessions[levelId(level)]?.completed) level++;
  return level;
}

const GamesContext = createContext<{
  sessions: Sessions;
  ready: boolean;
  error: string | null;
  unlocked: number;
  save: (id: string, session: Session) => void;
  retry: () => void;
} | null>(null);

export function GamesProvider({ children }: PropsWithChildren) {
  const [sessions, setSessions] = useState<Sessions>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Sessions>({});
  const queue = useRef(Promise.resolve());

  const load = useCallback(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      const saved = parseSessions(raw);
      latest.current = saved;
      setSessions(saved);
      setError(null);
      setReady(true);
    }).catch(() => {
      setError('We could not read your progress. Retry to keep your saved games safe.');
    });
  }, []);

  useEffect(() => { void load(); }, [load]);

  const persist = useCallback((snapshot: Sessions) => {
    // Serialize writes so quick taps cannot overwrite newer progress with an older save.
    queue.current = queue.current.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setError(null);
      } catch {
        setError('Progress is still here, but could not be saved. Free some space, then retry.');
      }
    });
  }, []);

  const save = useCallback((id: string, session: Session) => {
    const snapshot = { ...latest.current, [id]: session };
    latest.current = snapshot;
    setSessions(snapshot);
    persist(snapshot);
  }, [persist]);

  const retry = () => { if (ready) persist(latest.current); else void load(); };

  return <GamesContext value={{ sessions, ready, error, unlocked: unlockedLevel(sessions), save, retry }}>{children}</GamesContext>;
}

export function useGames() {
  const context = use(GamesContext);
  if (!context) throw new Error('useGames must be inside GamesProvider');
  return context;
}
