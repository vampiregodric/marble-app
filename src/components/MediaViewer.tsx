import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { colors, fonts } from '../theme/theme';
import { GalleryItem } from '../data/works';
import { useT } from '../i18n';

// Visualizador em ecrã inteiro da galeria de um trabalho: fotos inteiras
// (sem recorte) e vídeo com controlos nativos, deslizável entre itens, com
// contador em texto e "Fechar". O leitor de vídeo só existe para o item
// ativo — sai do ecrã, é libertado — para não descarregar vídeos que o
// cliente não vai ver.
type Props = {
  items: GalleryItem[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

export default function MediaViewer({ items, initialIndex, visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(initialIndex);
  const [stageHeight, setStageHeight] = useState(0);
  const listRef = useRef<FlatList<GalleryItem>>(null);
  const T = useT();

  useEffect(() => {
    if (visible) setActive(initialIndex);
  }, [visible, initialIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (idx !== active) setActive(idx);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Text style={styles.counter}>{items.length > 1 ? `${active + 1} / ${items.length}` : ''}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={T.common.close}>
            <Text style={styles.close}>{T.common.close}</Text>
          </Pressable>
        </View>
        <View style={styles.stage} onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}>
          {stageHeight > 0 ? (
            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={(it) => it.key}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onScroll={onScroll}
              scrollEventThrottle={16}
              // Garantia extra para o item inicial (o initialScrollIndex nem
              // sempre pega no browser antes de a lista ter tamanho).
              onLayout={() => listRef.current?.scrollToOffset({ offset: width * initialIndex, animated: false })}
              renderItem={({ item, index }) => <Slide item={item} width={width} height={stageHeight} active={index === active} />}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Slide({ item, width, height, active }: { item: GalleryItem; width: number; height: number; active: boolean }) {
  if (item.type === 'video') return <VideoSlide item={item} width={width} height={height} active={active} />;
  return <PhotoSlide uri={item.url} width={width} height={height} />;
}

function PhotoSlide({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const T = useT();
  return (
    <View style={[styles.slide, { width, height }]}>
      {failed ? (
        <Text style={styles.failed}>{T.gallery.photoFailed}</Text>
      ) : (
        <Image
          source={{ uri }}
          style={{ width, height }}
          resizeMode="contain"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      )}
      {!loaded && !failed ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.gold} /> : null}
    </View>
  );
}

// Fora do ecrã mostra só a miniatura; quando está ativo monta o leitor e
// começa a reproduzir (o cliente acabou de tocar ou deslizar para aqui).
function VideoSlide({ item, width, height, active }: { item: GalleryItem; width: number; height: number; active: boolean }) {
  if (!active) {
    return (
      <View style={[styles.slide, { width, height }]}>
        {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={{ width, height }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      </View>
    );
  }
  return <ActiveVideo url={item.url} width={width} height={height} />;
}

function ActiveVideo({ url, width, height }: { url: string; width: number; height: number }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return (
    <View style={[styles.slide, { width, height }]}>
      <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  counter: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 1, color: colors.inkMuted },
  close: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 1, color: colors.goldBright, textTransform: 'uppercase' },
  stage: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  failed: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, textAlign: 'center', paddingHorizontal: 32 },
});
