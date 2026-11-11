import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** Elemento à direita do título (ex.: botão de ação). */
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
};

/**
 * Estrutura padrão de tela: respeita o "notch"/barra de status (safe area),
 * aplica o fundo da marca e um cabeçalho consistente.
 */
export function Screen({ title, subtitle, headerRight, children, scroll = true, edges = ['top'] }: ScreenProps) {
  const header = title ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
      </View>
      {headerRight}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.xs },
  headerText: { flex: 1, gap: spacing.xxs },
});
