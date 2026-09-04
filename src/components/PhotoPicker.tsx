import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/theme';

export type PickedPhoto = {
  uri: string;
  // Fração 0..1 enquanto sobe; undefined antes de enviar; 1 depois.
  progress?: number;
};

type Props = {
  photos: PickedPhoto[];
  max: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
};

// Miniaturas das fotos escolhidas para um pedido de orçamento, mais um
// quadrado "Adicionar" enquanto houver lugar. A miniatura é a foto real do
// cliente; o único símbolo é o "×" de remover, que é uma ação.
export default function PhotoPicker({ photos, max, onAdd, onRemove, disabled }: Props) {
  const canAdd = photos.length < max && !disabled;
  return (
    <View style={styles.row}>
      {photos.map((p, i) => (
        <View key={`${p.uri}-${i}`} style={styles.tile}>
          <Image source={{ uri: p.uri }} style={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors />
          {p.progress !== undefined && p.progress < 1 ? (
            <View style={styles.progressWrap}>
              <Text style={styles.progressText}>{Math.round(p.progress * 100)}%</Text>
            </View>
          ) : null}
          {!disabled ? (
            <Pressable style={styles.remove} onPress={() => onRemove(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remover foto ${i + 1}`}>
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {canAdd ? (
        <Pressable style={[styles.tile, styles.addTile]} onPress={onAdd} accessibilityRole="button" accessibilityLabel="Adicionar foto">
          <Text style={styles.addText}>Adicionar</Text>
          <Text style={styles.addCount}>
            {photos.length}/{max}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const TILE = 76;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel2,
  },
  img: { width: '100%', height: '100%' },
  progressWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  progressText: { fontFamily: fonts.eyebrow, fontSize: 11, color: colors.goldBright },
  remove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.ink, fontSize: 14, lineHeight: 16, fontFamily: fonts.bodyBold },
  addTile: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderColor: colors.hairlineStrong, gap: 2 },
  addText: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  addCount: { fontFamily: fonts.body, fontSize: 9.5, color: colors.inkFaint },
});
