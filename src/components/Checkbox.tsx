import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme/theme';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  // Texto da etiqueta; pode incluir <Text> aninhados com links.
  children: React.ReactNode;
  error?: string;
  disabled?: boolean;
};

// Checkbox no estilo da app. Usada na aceitação dos termos no registo —
// nunca vem pré-marcada (RGPD exige ação afirmativa do utilizador).
export default function Checkbox({ checked, onChange, children, error, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.row}
        onPress={() => onChange(!checked)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        hitSlop={6}
      >
        <View style={[styles.box, checked && styles.boxChecked, !!error && styles.boxError]}>
          {checked && (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#0b0a08" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </View>
        <Text style={styles.label}>{children}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: colors.gold, borderColor: colors.gold },
  boxError: { borderColor: colors.danger },
  label: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.inkMuted },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginTop: 5, marginLeft: 30 },
});
