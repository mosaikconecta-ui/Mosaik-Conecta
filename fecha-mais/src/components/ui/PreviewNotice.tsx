import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { DEV_STAGE } from '@/constants/app';
import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

/**
 * Aviso exibido enquanto o app está em modo prévia (sem login/banco).
 * Deixa claro que nada ali é dado real. Será removido na etapa de autenticação.
 */
export function PreviewNotice({ message }: { message: string }) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Ionicons name="construct-outline" size={18} color={colors.slate} />
      <View style={styles.text}>
        <AppText variant="overline" color="textMuted">
          Modo prévia · {DEV_STAGE}
        </AppText>
        <AppText variant="label" color="textMuted">
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  text: { flex: 1, gap: spacing.xxs },
});
