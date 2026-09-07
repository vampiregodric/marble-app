import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/theme';

// Interruptor — só o desenho. Quem o usa envolve-o num Pressable com
// accessibilityRole="switch" e decide o que acontece ao tocar. Aparece nas
// preferências de notificação do Perfil e no passo "Recebe os alertas no
// telemóvel" (Secção 15), com o mesmo aspeto nos dois.
export default function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.track, on && styles.trackOn]}>
      <View style={[styles.thumb, on && styles.thumbOn]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 34, height: 19, borderRadius: 10, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, justifyContent: 'center' },
  trackOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  thumb: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.inkFaint, marginLeft: 2 },
  thumbOn: { backgroundColor: '#0b0a08', marginLeft: 17 },
});
