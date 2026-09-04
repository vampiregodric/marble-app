import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/theme';

type Props = {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  // Escolha única: tocar numa opção desmarca as outras (quem chama decide).
  accessibilityLabel?: string;
};

// Opções em "chips" (o que o cliente pretende, tipo de espaço, contacto
// preferido). Marcada = dourado cheio com texto escuro; a mesma linguagem
// visual dos chips de produtos no Detalhe do trabalho, sem ícones.
export default function OptionChips({ options, selected, onToggle, accessibilityLabel }: Props) {
  return (
    <View style={styles.wrap} accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable
            key={o}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onToggle(o)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            <Text style={[styles.text, on && styles.textOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.panel2,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  text: { fontFamily: fonts.bodySemibold, fontSize: 11.5, color: colors.inkMuted },
  textOn: { color: '#0b0a08' },
});
