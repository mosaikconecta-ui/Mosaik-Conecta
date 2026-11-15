import { StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme';

import { AppText } from './AppText';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
};

const SIZES = { sm: 20, md: 28, lg: 40 } as const;

/** Marca Fecha+: monograma + nome, com o "+" em verde esmeralda. */
export function Logo({ size = 'md', onDark = false }: LogoProps) {
  const fontSize = SIZES[size];
  const mark = Math.round(fontSize * 1.15);

  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel="Fecha+">
      <View
        style={[
          styles.mark,
          { width: mark, height: mark, borderRadius: mark * 0.3, backgroundColor: onDark ? colors.white : colors.graphite },
        ]}
      >
        <View style={[styles.plusH, { width: mark * 0.46, height: mark * 0.13 }]} />
        <View style={[styles.plusV, { width: mark * 0.13, height: mark * 0.46 }]} />
      </View>
      <AppText
        style={{
          fontFamily: fonts.displayBold,
          fontSize,
          lineHeight: fontSize * 1.2,
          letterSpacing: -fontSize * 0.03,
          color: onDark ? colors.white : colors.graphite,
        }}
      >
        Fecha<AppText style={{ fontFamily: fonts.displayBold, fontSize, color: colors.primary }}>+</AppText>
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { alignItems: 'center', justifyContent: 'center' },
  plusH: { position: 'absolute', backgroundColor: colors.primary, borderRadius: 2 },
  plusV: { position: 'absolute', backgroundColor: colors.primary, borderRadius: 2 },
});
