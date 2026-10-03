import { Button, Host, Text as NativeText } from '@expo/ui';
import { useState, type ComponentProps } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useGamesStatus } from '@/hooks/use-games';
import { useInteractionSound } from '@/hooks/use-interaction-sound';
import { useTheme } from '@/hooks/use-theme';

export function NativeButton({ label, onPress, disabled, variant = 'text', testID, height = 48, fontSize = 16, color, backgroundColor }: Pick<ComponentProps<typeof Button>, 'onPress' | 'disabled' | 'variant' | 'testID'> & {
  label: string; height?: number; fontSize?: number; color?: string; backgroundColor?: string;
}) {
  const theme = useTheme();
  const playSound = useInteractionSound();
  const [width, setWidth] = useState(0);
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%', height }} seedColor={theme.primary}
      onLayout={event => setWidth(Math.floor(event.nativeEvent.layout.width))}>
      <Button onPress={() => { if (disabled || !onPress) return; playSound(); onPress(); }} disabled={disabled} variant={variant} testID={testID}
        style={{ width: width || undefined, height, borderRadius: 14, backgroundColor, borderColor: theme.border }}>
        <NativeText textStyle={{ color: color ?? theme.primary, fontSize, fontWeight: '600' }}>{label}</NativeText>
      </Button>
    </Host>
  );
}

export function GameButton({ label, onPress, secondary = false, disabled = false }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  const theme = useTheme();
  return <NativeButton label={label} onPress={onPress} disabled={disabled} height={52} variant={secondary ? 'outlined' : 'filled'} color={secondary ? theme.primary : theme.primaryText} backgroundColor={secondary ? theme.backgroundElement : theme.primary} />;
}

export function GamePage({ children, contentContainerStyle, ...props }: ScrollViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView {...props} contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[{ width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) + 20, gap: 24 }, contentContainerStyle]}>
      {children}
    </ScrollView>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return <ThemedText type="smallBold" themeColor="textSecondary" style={{ fontSize: 11, letterSpacing: 2 }}>{children.toUpperCase()}</ThemedText>;
}

export function Headline({ children }: { children: string }) {
  return <ThemedText style={{ fontFamily: Fonts.serif, fontWeight: '400', fontSize: 40, lineHeight: 46, letterSpacing: -1 }}>{children}</ThemedText>;
}

export function SaveNotice() {
  const { error, retry } = useGamesStatus();
  const theme = useTheme();
  if (!error) return null;
  return <View style={{ padding: 16, backgroundColor: theme.errorSoft, borderRadius: 16, gap: 10 }}>
    <ThemedText selectable type="small" themeColor="error" accessibilityRole="alert">{error}</ThemedText>
    <GameButton label="Retry saving" onPress={retry} secondary />
  </View>;
}

export function MiniBoard({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const numbers = [1, 0, 3, 0, 5, 0, 7, 0, 9];
  return <View accessible={false} style={{ width: compact ? 82 : 120, height: compact ? 82 : 120, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: theme.primary, borderRadius: 12, overflow: 'hidden', transform: [{ rotate: '-7deg' }], backgroundColor: theme.backgroundElement }}>
    {numbers.map((digit, i) => <View key={i} style={{ width: '33.333%', height: '33.333%', alignItems: 'center', justifyContent: 'center', borderRightWidth: i % 3 < 2 ? 1 : 0, borderBottomWidth: i < 6 ? 1 : 0, borderColor: theme.border, backgroundColor: i === 4 ? theme.backgroundSelected : theme.backgroundElement }}>
      <ThemedText style={{ fontFamily: Fonts.serif, fontSize: compact ? 19 : 28, fontWeight: '400' }}>{digit ? String(digit) : ''}</ThemedText>
    </View>)}
  </View>;
}
