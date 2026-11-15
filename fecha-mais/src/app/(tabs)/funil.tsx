import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, PreviewNotice, Screen } from '@/components/ui';
import { PIPELINE_STAGES } from '@/constants/pipeline';
import { colors, radius, spacing } from '@/theme';

export default function PipelineScreen() {
  return (
    <Screen title="Funil" subtitle="Acompanhe cada oportunidade até o fechamento.">
      <PreviewNotice message="As oportunidades aparecem em cada estágio quando você cadastrar clientes." />

      <Card style={styles.list}>
        {PIPELINE_STAGES.map((stage, index) => {
          const isWon = stage.key === 'won';
          const isLost = stage.key === 'lost';
          const tint = isWon ? colors.primary : isLost ? colors.danger : colors.graphite;
          return (
            <View
              key={stage.key}
              style={[styles.row, index < PIPELINE_STAGES.length - 1 && styles.rowBorder]}
            >
              <View style={[styles.icon, { backgroundColor: isWon ? colors.primarySoft : isLost ? colors.dangerSoft : colors.lightGray }]}>
                <Ionicons name={stage.icon} size={18} color={tint} />
              </View>
              <View style={styles.rowText}>
                <AppText variant="bodyStrong">{stage.label}</AppText>
                <AppText variant="caption" color="textMuted">
                  Etapa {index + 1} de {PIPELINE_STAGES.length}
                </AppText>
              </View>
              <AppText variant="heading" color="textMuted" accessibilityLabel="Sem dados">
                —
              </AppText>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
});
