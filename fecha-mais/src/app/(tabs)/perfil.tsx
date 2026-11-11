import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, Card, Screen } from '@/components/ui';
import { APP_NAME, APP_SLOGAN, APP_VERSION, DEV_STAGE } from '@/constants/app';
import { colors, radius, spacing } from '@/theme';

export default function ProfileScreen() {
  return (
    <Screen title="Perfil">
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={28} color={colors.slate} />
        </View>
        <View style={styles.profileText}>
          <AppText variant="heading">Visitante</AppText>
          <AppText variant="label" color="textMuted">
            Você está usando a prévia, sem conta.
          </AppText>
          <View style={styles.badge}>
            <Badge label="Modo prévia" tone="warning" />
          </View>
        </View>
      </Card>

      <Card style={styles.info}>
        <InfoRow label="Aplicativo" value={APP_NAME} />
        <InfoRow label="Versão" value={APP_VERSION} />
        <InfoRow label="Fase" value={DEV_STAGE} last />
      </Card>

      <Card style={styles.privacy}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        <AppText variant="label" color="textMuted" style={styles.flex}>
          Nesta prévia nenhum dado é coletado ou salvo. Quando o login estiver ativo, seus dados ficarão
          isolados por empresa e protegidos no servidor.
        </AppText>
      </Card>

      <Button label="Sair da prévia" variant="secondary" icon="log-out-outline" onPress={() => router.replace('/')} />

      <AppText variant="caption" color="textMuted" align="center">
        {APP_SLOGAN}
      </AppText>
    </Screen>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <AppText color="textMuted">{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, gap: spacing.xxs },
  badge: { marginTop: spacing.xs },
  info: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  privacy: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
