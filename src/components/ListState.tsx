import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { FirestoreError } from 'firebase/firestore';
import { colors, fonts } from '../theme/theme';
import { S } from '../i18n';

// Estados de uma lista ligada ao Firestore: a carregar, vazia, ou com erro.
// Todos os ecrãs com listas usam isto em vez de ficarem em branco.

export function LoadingState() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}

type EmptyProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Mensagem legível para o cliente; o código técnico fica em baixo, pequeno,
// para o Fábio conseguir diagnosticar (ex: failed-precondition = índice em falta).
export function ErrorState({ error }: { error: FirestoreError }) {
  const friendly = error.code === 'unavailable' ? S.common.offline : S.errors.loadFailed;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{friendly}</Text>
      <Text style={styles.code}>{error.code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 6 },
  title: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkMuted, textAlign: 'center' },
  desc: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 17, color: colors.inkFaint, textAlign: 'center' },
  code: { fontFamily: fonts.body, fontSize: 9, color: colors.inkFaint, marginTop: 4 },
  action: { marginTop: 10, borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
});
