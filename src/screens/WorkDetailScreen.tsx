import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import WorkGallery from '../components/WorkGallery';
import MediaViewer from '../components/MediaViewer';
import { EmptyState, ErrorState } from '../components/ListState';
import { BackIcon, ShareIcon, CalendarIcon, CarIcon } from '../components/Icons';
import { galleryItems, useWork, workTags } from '../data/works';
import { categoryFullName } from '../data/categories';
import { RootStackParamList } from '../navigation/types';
import { formatDate } from '../utils/dates';
import { useAppWidth } from '../utils/layout';
import { useT } from '../i18n';

type Route = RouteProp<RootStackParamList, 'WorkDetail'>;

// Detalhe de um trabalho do portfólio, lido em tempo real. Se o trabalho não
// existir ou tiver sido despublicado (as regras negam a leitura), mostra
// "já não está disponível" em vez de rebentar — pode chegar-se aqui por um
// alerta antigo. O topo é a galeria (works.media[], deslizável); tocar num
// item abre-o em ecrã inteiro (MediaViewer), onde o vídeo reproduz.
export default function WorkDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const { data: work, loading, missing, error } = useWork(route.params.workId);
  const screenW = useAppWidth();
  const heroW = screenW - 36;
  // Proporção 4:3 para as fotos respirarem (decisão do Fábio, Secção 5b).
  const heroH = Math.round((heroW * 3) / 4);
  const items = useMemo(() => (work ? galleryItems(work) : []), [work]);
  // Secção 13: sistema/serviço primeiro, marcas depois (pedido do Fábio).
  const tags = useMemo(() => (work ? workTags(work) : []), [work]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const T = useT();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={T.common.back}>
          <BackIcon />
        </Pressable>
        {work ? (
          <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={T.common.share}>
            <ShareIcon />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : error ? (
        <ErrorState error={error} />
      ) : missing || !work ? (
        <EmptyState
          title={T.work.unavailableTitle}
          description={T.work.unavailableDesc}
          actionLabel={T.common.back}
          onAction={() => navigation.goBack()}
        />
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.heroWrap}>
              <WorkGallery
                items={items}
                seed={work.id}
                width={heroW}
                height={heroH}
                onOpen={items.length > 0 ? setViewerIndex : undefined}
                overlay={
                  <>
                    <View style={styles.heroOverlay} />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{categoryFullName(work.category)}</Text>
                    </View>
                    <Text style={styles.heroTitle}>{work.title}</Text>
                  </>
                }
              />
            </View>

            <View style={styles.meta}>
              {work.completedAt ? (
                <View style={styles.metaItem}>
                  <CalendarIcon size={12} color={colors.gold} />
                  <Text style={styles.metaText}>{T.work.completedOn(formatDate(work.completedAt))}</Text>
                </View>
              ) : null}
              {work.model ? (
                <View style={styles.metaItem}>
                  <CarIcon size={12} color={colors.gold} />
                  <Text style={styles.metaText}>{work.model}</Text>
                </View>
              ) : null}
            </View>

            {work.description ? <Text style={styles.desc}>{work.description}</Text> : null}

            {tags.length > 0 && (
              <View style={styles.tags} accessibilityRole="list">
                {tags.map((t) => (
                  <View
                    key={t.key}
                    style={[styles.chip, t.kind === 'service' && styles.chipService]}
                    accessibilityLabel={
                      t.kind === 'service' ? T.work.serviceA11y(t.text) : t.kind === 'brand' ? T.work.brandA11y(t.text) : `${t.text}${t.detail ? ` · ${t.detail}` : ''}`
                    }
                  >
                    <Text style={t.kind === 'service' ? styles.chipServiceText : styles.chipBrand}>{t.text}</Text>
                    {t.detail ? <Text style={styles.chipItem}> · {t.detail}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Secção 7: abre o formulário já com este trabalho como contexto
              (foto de capa + título) e o departamento pela categoria. */}
          <View style={styles.ctaBar}>
            <Pressable style={styles.ctaBtn} onPress={() => navigation.navigate('RequestQuote', { workId: work.id })} accessibilityRole="button">
              <Text style={styles.ctaText}>{T.work.requestSimilar}</Text>
            </Pressable>
          </View>

          <MediaViewer items={items} initialIndex={viewerIndex ?? 0} visible={viewerIndex !== null} onClose={() => setViewerIndex(null)} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, minHeight: 42 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { marginHorizontal: 18, marginTop: 12 },
  // Escurece só a metade de baixo, onde está o título — a foto fica visível.
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', backgroundColor: 'rgba(0,0,0,0.45)' },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  heroTitle: { position: 'absolute', left: 14, right: 14, bottom: 12, fontFamily: fonts.bodyExtraBold, fontSize: 16, color: colors.ink, lineHeight: 21 },
  meta: { flexDirection: 'row', gap: 16, paddingHorizontal: 18, marginTop: 6, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint },
  desc: { paddingHorizontal: 18, marginTop: 14, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.inkMuted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, marginTop: 16, gap: 8, paddingBottom: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  // O sistema/serviço distingue-se da marca: contorno dourado e maiúsculas
  // (como o selo da categoria), a marca fica em texto normal.
  chipService: { borderColor: colors.hairlineStrong, backgroundColor: 'rgba(198,161,91,0.10)' },
  chipServiceText: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  chipBrand: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.ink },
  chipItem: { fontFamily: fonts.body, fontSize: 10, color: colors.inkMuted },
  ctaBar: { padding: 18, borderTopWidth: 1, borderTopColor: colors.hairline },
  ctaBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
});
