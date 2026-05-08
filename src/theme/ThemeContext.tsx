/**
 * ThemeProvider + useTheme + useColors (file 15).
 *
 * Persisted preference key: vela.theme.preference (AsyncStorage).
 * Default: 'system' — follows OS appearance.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ThemeColors, type ThemeMode } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';

const PREFERENCE_KEY = 'vela.theme.preference';

interface ThemeContextValue {
  mode: ThemeMode;
  preference: ThemePreference;
  colors: ThemeColors;
  setPreference: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** Optional override for tests / Storybook. */
  initialPreference?: ThemePreference;
}

export function ThemeProvider({ children, initialPreference }: ThemeProviderProps) {
  const systemScheme = useColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initialPreference ?? 'system',
  );
  const [hydrated, setHydrated] = useState(initialPreference !== undefined);

  useEffect(() => {
    if (initialPreference !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFERENCE_KEY);
        if (cancelled) return;
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setPreferenceState(stored);
        }
      } catch {
        // Non-fatal — default to system.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPreference]);

  // Listen for OS appearance changes when preference === 'system'.
  const [, forceRerender] = useState(0);
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => forceRerender((x) => x + 1));
    return () => sub.remove();
  }, []);

  const mode: ThemeMode = useMemo(() => {
    if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return preference;
  }, [preference, systemScheme]);

  const colors: ThemeColors = useMemo(() => (mode === 'dark' ? darkColors : lightColors), [mode]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(PREFERENCE_KEY, next);
    } catch {
      // Non-fatal.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, preference, colors, setPreference }),
    [mode, preference, colors, setPreference],
  );

  if (!hydrated && initialPreference === undefined) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}

export function useThemeMode(): ThemeMode {
  return useTheme().mode;
}
