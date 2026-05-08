/**
 * Shared Apple + Google entry for sign-up and sign-in (file 08).
 */
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';

export interface SocialAuthButtonsProps {
  /** When true, disables both entry points. */
  busy?: boolean;
  onApple: () => void | Promise<void>;
  onGoogle: () => void | Promise<void>;
}

export function SocialAuthButtons({ busy, onApple, onGoogle }: SocialAuthButtonsProps) {
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return;
    }
    void AppleAuthentication.isAvailableAsync().then((v) => {
      if (!cancelled) setAppleAvailable(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.stack, busy && styles.dimmed]} pointerEvents={busy ? 'none' : 'auto'}>
      {Platform.OS === 'ios' && appleAvailable ? (
        <View style={styles.appleWrap}>
          <AppleAuthenticationButton
            buttonType={AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={() => void onApple()}
          />
        </View>
      ) : null}
      <Button
        label="Continue with Google"
        variant="secondary"
        fullWidth
        disabled={busy}
        onPress={() => void onGoogle()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.md },
  dimmed: { opacity: 0.55 },
  appleWrap: { width: '100%', height: 48 },
  appleButton: { width: '100%', height: 48 },
});
