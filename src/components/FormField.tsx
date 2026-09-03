import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, fonts } from '../theme/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

// Campo de formulário no estilo da app: etiqueta em eyebrow, caixa preta com
// contorno dourado que acende quando está focado.
export default function FormField({ label, error, hint, style, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkFaint}
        selectionColor={colors.gold}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...input}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          input.editable === false && styles.inputDisabled,
          style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontFamily: fonts.eyebrow,
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: { borderColor: colors.gold },
  inputError: { borderColor: colors.danger },
  inputDisabled: { color: colors.inkMuted },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginTop: 5 },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginTop: 5 },
});
