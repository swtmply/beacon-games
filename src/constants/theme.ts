import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#14213D',
    background: '#F3F6FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E1EBFF',
    textSecondary: '#5F6E88',
    primary: '#245CE5',
    primaryText: '#FFFFFF',
    border: '#CBD6E8',
    accent: '#916000',
    accentSoft: '#FFF0C7',
    error: '#BC354C',
    errorSoft: '#FCE4EA',
  },
  dark: {
    text: '#EFF4FF',
    background: '#0B1224',
    backgroundElement: '#131F36',
    backgroundSelected: '#203967',
    textSecondary: '#A2B2CD',
    primary: '#78A7FF',
    primaryText: '#08162E',
    border: '#304464',
    accent: '#F4C568',
    accentSoft: '#382F20',
    error: '#FF95A7',
    errorSoft: '#402333',
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
