import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useThemeMode } from '@/theme/ThemeContext';

export function ThemedStatusBar() {
  const mode = useThemeMode();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} animated />;
}
