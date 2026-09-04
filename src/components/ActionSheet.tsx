import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';
import { WEB_MAX_WIDTH } from '../utils/layout';

// Menu de ações no fundo do ecrã, no estilo da app (o Alert/ActionSheet do
// sistema não existe igual nos três lados e não segue o tema). Uma linha de
// texto por ação; "Cancelar" fecha sempre. Tocar fora também fecha.
export type SheetAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
};

export default function ActionSheet({ visible, title, actions, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* O fundo não leva accessibilityRole="button": na web viraria um
          <button> com botões lá dentro (HTML inválido, avisos do React). */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar menu">
        {/* Pressable vazio a envolver o painel para o toque lá dentro não fechar. */}
        <Pressable style={[styles.sheet, { paddingBottom: 8 + insets.bottom }]} onPress={() => {}}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {actions.map((a) => (
            <Pressable key={a.label} style={styles.row} onPress={a.onPress} accessibilityRole="button">
              <Text style={[styles.rowText, a.destructive && styles.rowTextDestructive]}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.row, styles.cancelRow]} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    ...(Platform.OS === 'web' && { maxWidth: WEB_MAX_WIDTH }),
    backgroundColor: colors.panel2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: fonts.eyebrow,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: 12,
  },
  row: { paddingVertical: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.hairline },
  rowText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink },
  rowTextDestructive: { color: colors.danger },
  cancelRow: { marginTop: 6, borderTopWidth: 0, backgroundColor: colors.panel, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline },
  cancelText: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
});
