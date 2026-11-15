import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Use em fundos escuros (grafite). */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

/**
 * Botão padrão. Tem leve animação de "aperto" ao tocar e estados de
 * carregamento/desabilitado, para o usuário sempre saber o que está acontecendo.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  onDark = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const isDisabled = disabled || loading;

  const animateTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const palette = getPalette(variant, onDark);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: pressed ? palette.bgPressed : palette.bg, borderColor: palette.border },
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <View style={styles.content}>
            {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
            <AppText style={[styles.label, { color: palette.fg }]}>{label}</AppText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function getPalette(variant: Variant, onDark: boolean) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, bgPressed: colors.primaryPressed, fg: colors.onPrimary, border: 'transparent' };
    case 'secondary':
      return onDark
        ? { bg: 'transparent', bgPressed: 'rgba(255,255,255,0.08)', fg: colors.white, border: 'rgba(255,255,255,0.24)' }
        : { bg: colors.surface, bgPressed: colors.lightGray, fg: colors.text, border: colors.border };
    case 'ghost':
      return {
        bg: 'transparent',
        bgPressed: onDark ? 'rgba(255,255,255,0.08)' : colors.lightGray,
        fg: onDark ? colors.white : colors.text,
        border: 'transparent',
      };
    case 'danger':
      return { bg: colors.dangerSoft, bgPressed: '#FEE2E2', fg: colors.danger, border: 'transparent' };
  }
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20 },
  disabled: { opacity: 0.5 },
});
