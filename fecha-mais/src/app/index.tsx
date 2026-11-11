import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Logo } from '@/components/ui';
import { APP_SLOGAN, DEV_STAGE } from '@/constants/app';
import { colors, radius, spacing } from '@/theme';

const HIGHLIGHTS = [
  'Clientes e oportunidades em um só lugar',
  'Funil de vendas do primeiro contato ao fechamento',
  'Lembretes de follow-up para não perder nenhuma venda',
];

/**
 * Tela de boas-vindas. Na Etapa 2 os botões abaixo levarão para
 * cadastro e login reais (Supabase). Por enquanto, abre a prévia do app.
 */
export default function WelcomeScreen() {
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fade]);

  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <Animated.View style={[styles.container, { opacity: fade, transform: [{ translateY }] }]}>
        <Logo size="md" onDark />

        <View style={styles.hero}>
          <AppText variant="display" color="textOnDark" style={styles.slogan}>
            {APP_SLOGAN.split('. ')[0]}.{'\n'}
            <AppText variant="display" color="primary">
              {APP_SLOGAN.split('. ')[1]}
            </AppText>
          </AppText>
          <AppText color="textOnDarkMuted" style={styles.subtitle}>
            O CRM de bolso para quem vende, atende e precisa lembrar de tudo.
          </AppText>

          <View style={styles.list}>
            {HIGHLIGHTS.map((item) => (
              <View key={item} style={styles.listItem}>
                <View style={styles.dot} />
                <AppText color="textOnDark" style={styles.listText}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Conhecer o app"
            icon="arrow-forward"
            onPress={() => router.replace('/inicio')}
            accessibilityHint="Abre a prévia do aplicativo, sem dados reais"
          />
          <AppText variant="caption" color="textOnDarkMuted" align="center">
            {DEV_STAGE} · cadastro e login chegam na próxima etapa
          </AppText>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.graphite },
  container: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: spacing.lg },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  slogan: { fontSize: 38, lineHeight: 44 },
  subtitle: { fontSize: 16, lineHeight: 24, maxWidth: 320 },
  list: {
    marginTop: spacing.md,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  listText: { flex: 1 },
  actions: { gap: spacing.md },
});
