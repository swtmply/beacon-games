import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { createContext, use, useCallback, useEffect, useRef, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

const InteractionSoundContext = createContext<(() => void) | null>(null);

export function InteractionSoundProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(require('@/assets/sounds/interaction-chime.wav'), {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const ready = useRef(false);
  const pending = useRef(false);

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
    return () => { mounted = false; ready.current = false; };
  }, [player]);

  const playSound = useCallback(() => {
    // Duration remains available after the clip ends, unlike Android's isLoaded flag.
    if (!ready.current || player.duration <= 0 || player.playing || pending.current || AppState.currentState !== 'active') return;
    // Reuse one player and skip rapid taps instead of stacking or queuing chimes.
    pending.current = true;
    void player.seekTo(0).then(() => {
      if (ready.current && AppState.currentState === 'active') player.play();
    }).catch(() => {
      // The interaction still works if playback is unavailable.
    }).finally(() => { pending.current = false; });
  }, [player]);

  return <InteractionSoundContext value={playSound}>{children}</InteractionSoundContext>;
}

export function useInteractionSound() {
  const context = use(InteractionSoundContext);
  if (!context) throw new Error('useInteractionSound must be inside InteractionSoundProvider');
  return context;
}
