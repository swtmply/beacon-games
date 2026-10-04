import { setAudioModeAsync, useAudioPlayer, useAudioPlaylist, type AudioSource } from 'expo-audio';
import { Asset } from 'expo-asset';
import { createContext, use, useCallback, useEffect, useRef, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

const sounds = {
  error: require('@/assets/sounds/error.wav'),
  correct: require('@/assets/sounds/correct.wav'),
  note: require('@/assets/sounds/note.wav'),
  row: require('@/assets/sounds/row.wav'),
  column: require('@/assets/sounds/column.wav'),
  box: require('@/assets/sounds/box.wav'),
} satisfies Record<string, AudioSource>;

export type InteractionSound = keyof typeof sounds;
const InteractionSoundContext = createContext<((...sounds: InteractionSound[]) => void) | null>(null);

export function InteractionSoundProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(require('@/assets/sounds/interaction-chime.wav'), {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const feedback = useAudioPlaylist();
  const ready = useRef(false);
  const pending = useRef(false);
  const request = useRef(0);

  useEffect(() => {
    let mounted = true;
    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).then(() => {
      if (mounted) ready.current = true;
    }).catch(() => {
      // Sound is optional feedback; audio failures must not block the app.
    });
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') return;
      request.current++;
      player.pause();
      feedback.clear();
    });
    return () => { mounted = false; ready.current = false; listener.remove(); };
  }, [feedback, player]);

  const playSound = useCallback((...actions: InteractionSound[]) => {
    if (!ready.current || AppState.currentState !== 'active') return;
    if (actions.length) {
      // Outcomes replace old feedback; multiple completions play in order.
      request.current++;
      try {
        player.pause();
        feedback.clear();
        // Playlist.add does not resolve bundled asset IDs like useAudioPlayer does.
        actions.forEach(action => {
          const asset = Asset.fromModule(sounds[action]);
          feedback.add({ uri: asset.localUri ?? asset.uri });
        });
        feedback.play();
      } catch {
        // The interaction still works if playback is unavailable.
      }
      return;
    }
    // Duration remains available after the clip ends, unlike Android's isLoaded flag.
    if (player.duration <= 0 || player.playing || pending.current || feedback.playing || feedback.isBuffering) return;
    // Reuse one player and skip rapid taps instead of stacking or queuing chimes.
    pending.current = true;
    const id = ++request.current;
    void player.seekTo(0).then(() => {
      if (id === request.current && ready.current && AppState.currentState === 'active') player.play();
    }).catch(() => {
      // The interaction still works if playback is unavailable.
    }).finally(() => { pending.current = false; });
  }, [feedback, player]);

  return <InteractionSoundContext value={playSound}>{children}</InteractionSoundContext>;
}

export function useInteractionSound() {
  const context = use(InteractionSoundContext);
  if (!context) throw new Error('useInteractionSound must be inside InteractionSoundProvider');
  return context;
}
