import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/theme';

// Avatar do cliente: a foto de perfil (clients/{uid}.avatarUrl) ou, sem
// foto / se a foto falhar a carregar, as iniciais do nome sobre dourado.
// O pai decide o tamanho; o círculo e a borda são daqui.
type Props = {
  url?: string | null;
  name: string;
  size: number;
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export default function Avatar({ url, name, size }: Props) {
  const uri = url && url.trim() ? url.trim() : null;
  const [failed, setFailed] = useState(false);
  // Uma foto nova pode carregar mesmo que a anterior tenha falhado.
  useEffect(() => setFailed(false), [uri]);

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={styles.fill}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.32) }]}>{initialsOf(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.goldDim,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  initials: { fontFamily: fonts.eyebrow, color: colors.goldBright },
});
