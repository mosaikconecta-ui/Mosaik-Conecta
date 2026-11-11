import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, PreviewNotice, Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';

const FILTERS = [
  {
    key: 'pending',
    label: 'Pendentes',
    empty: { title: 'Nenhuma tarefa pendente', description: 'Lembretes de follow-up que ainda vão acontecer aparecem aqui.' },
  },
  {
    key: 'overdue',
    label: 'Atrasadas',
    empty: { title: 'Nada atrasado', description: 'Se algum follow-up passar do horário, ele aparece aqui em destaque.' },
  },
  {
    key: 'done',
    label: 'Concluídas',
    empty: { title: 'Nenhuma tarefa concluída', description: 'O histórico das tarefas que você marcar como feitas fica aqui.' },
  },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function TasksScreen() {
  const [filter, setFilter] = useState<FilterKey>('pending');
  const current = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];

  return (
    <Screen title="Tarefas" subtitle="Seus lembretes de follow-up.">
      <View style={styles.segment} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <AppText style={[styles.segmentLabel, { color: active ? colors.graphite : colors.slate }]}>
                {f.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <PreviewNotice message="Criar lembretes com data, horário e cliente associado chega na Etapa 5." />

      <Card>
        <EmptyState icon="checkbox-outline" title={current.empty.title} description={current.empty.description} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentItemActive: {
    backgroundColor: colors.surface,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: { fontFamily: fonts.semiBold, fontSize: 13 },
});
