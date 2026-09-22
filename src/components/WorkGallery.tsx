import React, { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, NativeSyntheticEvent, NativeScrollEvent, ListRenderItem } from 'react-native';
import { colors, fonts } from '../theme/theme';
import Photo from './Photo';
import { GalleryItem } from '../data/works';
import { useT } from '../i18n';

// Galeria do topo do Detalhe: fotos e vídeos do trabalho (works.media[]),
// deslizável, com contador "3 / 7" e pontos de posição. Um vídeo mostra a
// miniatura com a etiqueta "Ver vídeo" — o vídeo em si só carrega no
// visualizador em ecrã inteiro (MediaViewer), ao tocar. Sem itens, mostra o
// gradiente. `overlay` (selo de categoria, título) é desenhado por cima e
// não apanha toques, para o deslizar e o tocar continuarem a funcionar.
type Props = {
  items: GalleryItem[];
  seed: string;
  width: number;
  height: number;
  overlay?: React.ReactNode;
  onOpen?: (index: number) => void;
};

const keyOf = (item: GalleryItem) => item.key;

export default function WorkGallery({ items, seed, width, height, overlay, onOpen }: Props) {
  const [active, setActive] = useState(0);
  const many = items.length > 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (idx !== active) setActive(idx);
  };

  const renderItem: ListRenderItem<GalleryItem> = useCallback(
    ({ item, index }) => <GallerySlide item={item} index={index} count={items.length} seed={seed} width={width} height={height} onOpen={onOpen} />,
    [items.length, seed, width, height, onOpen]
  );
  const getItemLayout = useCallback(
    (_: ArrayLike<GalleryItem> | null | undefined, index: number) => ({ length: width, offset: width * index, index }),
    [width]
  );

  return (
    <View>
      <View style={[styles.hero, { width, height }]}>
        {items.length === 0 ? (
          <Photo url={null} seed={seed} />
        ) : (
          // FlatList em vez de ScrollView (DES-11 da auditoria de 2026-09-12):
          // só o item à vista e os vizinhos ficam montados, por isso um
          // trabalho com dez fotos descarrega uma ao abrir, não dez. O mesmo
          // padrão do MediaViewer.
          <FlatList
            data={items}
            keyExtractor={keyOf}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={getItemLayout}
            initialNumToRender={1}
            windowSize={3}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ width, height }}
          />
        )}
        {overlay ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {overlay}
          </View>
        ) : null}
        {many ? (
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {active + 1} / {items.length}
            </Text>
          </View>
        ) : null}
      </View>
      {many ? (
        <View style={styles.dots}>
          {items.map((item, i) => (
            <View key={item.key} style={[styles.dot, i === active && styles.dotActive]} />
          ))}
        </View>
      ) : (
        <View style={styles.dotsSpacer} />
      )}
    </View>
  );
}

// Um slide. Memoizado: deslizar muda `active` no pai e não deve voltar a
// desenhar os slides (nem pedir as fotos outra vez).
const GallerySlide = memo(function GallerySlide({
  item,
  index,
  count,
  seed,
  width,
  height,
  onOpen,
}: {
  item: GalleryItem;
  index: number;
  count: number;
  seed: string;
  width: number;
  height: number;
  onOpen?: (index: number) => void;
}) {
  const T = useT();
  return (
    <Pressable
      style={{ width, height }}
      onPress={onOpen ? () => onOpen(index) : undefined}
      accessibilityRole="imagebutton"
      accessibilityLabel={T.gallery.itemA11y(item.type, index + 1, count)}
    >
      {/* Foto INTEIRA (decisão do Fábio, 2026-09-09: no Detalhe a foto do
          trabalho tem de se ver completa); a margem fica no fundo escuro. A
          miniatura do vídeo segue a mesma regra. `width` pede ao Cloudinary a
          variante da largura do herói em vez dos 1600 px (DES-02). */}
      <Photo url={item.type === 'video' ? item.thumbnailUrl : item.url} seed={`${seed}-${index}`} fit="contain" width={width} />
      {item.type === 'video' ? (
        <View style={styles.videoPillWrap} pointerEvents="none">
          <View style={styles.videoPill}>
            <Text style={styles.videoPillText}>{T.gallery.seeVideo}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hero: { position: 'relative', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.panel2 },
  videoPillWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  videoPill: { backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1, borderColor: colors.gold, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  videoPillText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 1.2, color: colors.goldBright, textTransform: 'uppercase' },
  counter: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  counterText: { fontFamily: fonts.eyebrow, fontSize: 9, letterSpacing: 0.8, color: colors.ink },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8, height: 5 },
  dotsSpacer: { height: 5, marginTop: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.goldBright, width: 14 },
});
