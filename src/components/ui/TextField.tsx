import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Radii, Spacing, Layout } from '@/theme/spacing';
import { Typography } from '@/theme/typography';
import { Caption, Label } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helper?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  helper,
  errorText,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Label style={{ marginBottom: Spacing.xs }}>{label}</Label> : null}
      <View
        style={{
          borderRadius: Radii.md,
          paddingHorizontal: Spacing.base,
          height: Layout.tapTarget,
          justifyContent: 'center',
          backgroundColor: colors.surface.raised,
          borderColor: errorText
            ? colors.error.default
            : focused
              ? colors.border.accent
              : colors.border.default,
          borderWidth: Layout.hairline,
        }}
      >
        <TextInput
          {...rest}
          placeholderTextColor={colors.text.tertiary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            Typography.body,
            { color: colors.text.primary, padding: 0 },
          ]}
        />
      </View>
      {errorText ? (
        <Caption tone="primary" style={{ color: colors.error.default, marginTop: Spacing.xs }}>
          {errorText}
        </Caption>
      ) : helper ? (
        <Caption style={{ marginTop: Spacing.xs }}>{helper}</Caption>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
});
