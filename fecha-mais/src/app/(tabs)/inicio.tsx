import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, Logo, PreviewNotice, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type Metric = { label: string; icon: ComponentProps<typeof Ionicons>['name'] };

// Indicadores do dashboard. Valores reais virão do Supabase na Etapa 4;
// até lá exibimos "—" (nunca números inventados).
const METRICS: Metric[] = [
  { label: 'Total de leads', icon: 'people-outline' },
  { label: 'Leads novos', icon: 'sparkles-outline' },
  { label: 'Em negociação', icon: 'swap-horizontal-outline' },
  { label: 'Vendas fechadas', icon: 'trophy-outline' },
];

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.top}>
        <Logo size="sm" />
      </View>

      <View style={styles.greeting}>
        <AppText variant="title">Olá! 👋</AppText>
        <AppText color="textMuted">Este é o resumo das suas vendas.</AppText>
      </View>

      <PreviewNotice message="Os indicadores aparecem aqui quando você tiver uma conta e cadastrar seus clientes." />

      <Card style={styles.highlight}>
        <AppText variant="overline" color="textOnDarkMuted">
          Valor em oportunidades
        </AppText>
        <AppText variant="display" color="textOnDark">
          R$ —
        </AppText>
        <View style={styles.divider} />
        <View style={styles.highlightRow}>
          <AppText variant="label" color="textOnDarkMuted">
            Vendido no período
          </AppText>
          <AppText variant="bodyStrong" color="primary">
            R$ —
          </AppText>
        </View>
      </Card>

      <View style={styles.grid}>
        {METRICS.map((m) => (
          <Card key={m.label} style={styles.metric}>
            <View style={styles.metricIcon}>
              <Ionicons name={m.icon} size={18} color={colors.graphite} />
            </View>
            <AppText variant="title">—</AppText>
            <AppText variant="label" color="textMuted">
              {m.label}
            </AppText>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Próximos follow-ups</AppText>
        <Card>
          <EmptyState
            icon="calendar-clear-outline"
            title="Nenhum follow-up agendado"
            description="Seus próximos contatos com clientes vão aparecer aqui, em ordem de data."
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { gap: spacing.xxs },
  highlight: { backgroundColor: colors.graphite, borderColor: colors.graphite, gap: spacing.xs, padding: spacing.xl },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: spacing.md },
  highlightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  section: { gap: spacing.md, marginTop: spacing.sm },
});
