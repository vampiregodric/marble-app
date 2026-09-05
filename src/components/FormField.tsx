import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, Pressable } from 'react-native';
import { colors, fonts } from '../theme/theme';
import { EyeIcon, EyeOffIcon } from './Icons';
import { useT } from '../i18n';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

// Campo de formulário no estilo da app: etiqueta em eyebrow, caixa preta com
// contorno dourado que acende quando está focado. Campos de password
// (`secureTextEntry`) ganham um olho à direita para mostrar/ocultar o texto.
export default function FormField({ label, error, hint, style, secureTextEntry, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecure = !!secureTextEntry;
  const T = useT();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor={colors.inkFaint}
          selectionColor={colors.gold}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isSecure && !revealed}
          {...input}
          style={[
            styles.input,
            isSecure && styles.inputWithEye,
            focused && styles.inputFocused,
            !!error && styles.inputError,
            input.editable === false && styles.inputDisabled,
            style,
          ]}
        />
        {isSecure && (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            style={styles.eye}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? T.form.hidePassword : T.form.showPassword}
          >
            {revealed ? <EyeOffIcon color={colors.gold} /> : <EyeIcon color={colors.inkMuted} />}
          </Pressable>
        )}
      </View>
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
  inputWithEye: { paddingRight: 46 },
  inputFocused: { borderColor: colors.gold },
  inputError: { borderColor: colors.danger },
  inputDisabled: { color: colors.inkMuted },
  eye: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginTop: 5 },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginTop: 5 },
});
