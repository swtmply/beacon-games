import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

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
const RECOVERY_KEY = 'beacon:sudoku:recovery';

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

function parseSessions(raw: string | null) {
  const sessions: Sessions = {};
  if (raw === null) return { sessions, valid: true };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { sessions, valid: false }; }
  if (!isObject(data)) return { sessions, valid: false };
  let valid = true;
  for (const [id, value] of Object.entries(data)) {
    const puzzle = getPuzzle(id);
    if (puzzle && isSession(value, puzzle)) sessions[id] = value;
    else valid = false;
  }
  return { sessions, valid };
}

function unlockedLevel(sessions: Sessions) {
  let level = 1;
  while (level < LEVEL_COUNT && sessions[levelId(level)]?.completed) level++;
  return level;
}

const SessionsContext = createContext<Sessions | null>(null);
const GamesContext = createContext<{
  ready: boolean;
  error: string | null;
  busy: boolean;
  canRecover: boolean;
  unlocked: number;
  save: (id: string, session: Session) => void;
  retry: () => void;
  recover: () => void;
} | null>(null);

export function GamesProvider({ children }: PropsWithChildren) {
  const [sessions, setSessions] = useState<Sessions>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<{ raw: string; sessions: Sessions } | null>(null);
  const loading = useRef(false);
  const latest = useRef<Sessions>({});
  const queue = useRef(Promise.resolve());

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    setRecovery(null);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = parseSessions(raw);
      if (!saved.valid && raw !== null) {
        setRecovery({ raw, sessions: saved.sessions });
        setError('Some saved progress is damaged. Recovery keeps readable games and backs up the original data on this device before replacing it. Unreadable games will start over.');
        return;
      }
      latest.current = saved.sessions;
      setSessions(saved.sessions);
      setError(null);
      setReady(true);
    } catch {
      setError('We could not read your progress. Retry to keep your saved games safe.');
    } finally {
      loading.current = false;
      setBusy(false);
    }
  }, []);

  const recover = useCallback(async () => {
    if (!recovery || loading.current) return;
    loading.current = true;
    setBusy(true);
    try {
      // Preserve the full original before replacing any damaged progress.
      await AsyncStorage.setItem(RECOVERY_KEY, recovery.raw);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recovery.sessions));
      latest.current = recovery.sessions;
      setSessions(recovery.sessions);
      setRecovery(null);
      setError(null);
      setReady(true);
    } catch {
      setError('Recovery could not finish. Your original data has not been discarded. Free some space, then try recovery again.');
    } finally {
      loading.current = false;
      setBusy(false);
    }
  }, [recovery]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

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

  const retry = useCallback(() => { if (ready) persist(latest.current); else void load(); }, [ready, persist, load]);
  const unlocked = unlockedLevel(sessions);
  // Progress changes should not refresh navigation or save notices.
  const canRecover = recovery !== null;
  const status = useMemo(() => ({ ready, error, busy, canRecover, unlocked, save, retry, recover }), [ready, error, busy, canRecover, unlocked, save, retry, recover]);

  return <GamesContext value={status}><SessionsContext value={sessions}>{children}</SessionsContext></GamesContext>;
}

export function useGamesStatus() {
  const context = use(GamesContext);
  if (!context) throw new Error('useGamesStatus must be inside GamesProvider');
  return context;
}

export function useGames() {
  const status = useGamesStatus();
  const sessions = use(SessionsContext);
  if (!sessions) throw new Error('useGames must be inside GamesProvider');
  return { ...status, sessions };
}
