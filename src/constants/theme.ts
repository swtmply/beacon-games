/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#253D35',
    background: '#F7F5EF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4ECE3',
    textSecondary: '#69746A',
    primary: '#315B48',
    primaryText: '#FFFFFF',
    border: '#D8DED3',
    accent: '#8A581F',
    accentSoft: '#F1E6D2',
    error: '#A33C34',
    errorSoft: '#FAE4DF',
  },
  dark: {
    text: '#E9EDE2',
    background: '#17221D',
    backgroundElement: '#223229',
    backgroundSelected: '#344F3E',
    textSecondary: '#A7B4A5',
    primary: '#ADCDB4',
    primaryText: '#17221D',
    border: '#405345',
    accent: '#E9B574',
    accentSoft: '#493E2C',
    error: '#FFB4A8',
    errorSoft: '#583A36',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
