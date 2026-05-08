/**
 * Permissions (file 07).
 *
 * Camera permission requested here. Notifications permission deferred until
 * post-baseline reveal (file 12 canonical timing). Photos permission deferred
 * until first share (file 13 lazy-permission rule).
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Headline } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/theme/spacing';

export default function Permissions() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Headline style={{ marginBottom: Spacing.lg }}>Camera access</Headline>
        <Body tone="secondary">
          Vela uses your camera to capture weekly face scans using AR alignment. Photos stay on
          your device.
        </Body>
      </View>
      <Button
        label="Allow camera"
        fullWidth
        onPress={() => router.replace('/(capture)/capture?isBaseline=true')}
      />
    </Screen>
  );
}
