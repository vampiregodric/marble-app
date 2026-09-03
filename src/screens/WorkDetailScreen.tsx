import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import { EmptyState, ErrorState } from '../components/ListState';
import { BackIcon, ShareIcon, CalendarIcon, CarIcon } from '../components/Icons';
import { useWork } from '../data/works';
import { categoryFullName } from '../data/categories';
import { RootStackParamList } from '../navigation/types';
import { formatDate } from '../utils/dates';

type Route = RouteProp<RootStackParamList, 'WorkDetail'>;

// Detalhe de um trabalho do portfólio, lido em tempo real. Se o trabalho não
// existir ou tiver sido despublicado (as regras negam a leitura), mostra
// "já não está disponível" em vez de rebentar — pode chegar-se aqui por um
// alerta antigo.
export default function WorkDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { data: work, loading, missing, error } = useWork(route.params.workId);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
          <BackIcon />
        </Pressable>
        {work ? (
          <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Partilhar">
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
          title="Este trabalho já não está disponível."
          description="Pode ter sido retirado do portfólio. Vê os outros trabalhos publicados."
          actionLabel="Voltar"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <Photo url={work.photoUrl} seed={work.id} />
              <View style={styles.heroOverlay} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{categoryFullName(work.category)}</Text>
              </View>
              <Text style={styles.heroTitle}>{work.title}</Text>
            </View>

            <View style={styles.meta}>
              {work.completedAt ? (
                <View style={styles.metaItem}>
                  <CalendarIcon size={12} color={colors.gold} />
                  <Text style={styles.metaText}>Concluído: {formatDate(work.completedAt)}</Text>
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

            {work.products?.length > 0 && (
              <View style={styles.products}>
                {work.products.map((p, i) => (
                  <View key={`${p.brand}-${i}`} style={styles.chip}>
                    <Text style={styles.chipBrand}>{p.brand}</Text>
                    {p.item ? <Text style={styles.chipItem}> · {p.item}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.ctaBar}>
            <Pressable style={styles.ctaBtn}>
              <Text style={styles.ctaText}>Pedir orçamento semelhante</Text>
            </Pressable>
          </View>
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
  hero: { position: 'relative', margin: 18, marginTop: 12, height: 210, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.panel2 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  heroTitle: { position: 'absolute', left: 14, right: 14, bottom: 12, fontFamily: fonts.bodyExtraBold, fontSize: 16, color: colors.ink, lineHeight: 21 },
  meta: { flexDirection: 'row', gap: 16, paddingHorizontal: 18, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint },
  desc: { paddingHorizontal: 18, marginTop: 14, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.inkMuted },
  products: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, marginTop: 16, gap: 8, paddingBottom: 18 },
  chip: { flexDirection: 'row', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipBrand: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.goldBright },
  chipItem: { fontFamily: fonts.body, fontSize: 10, color: colors.inkMuted },
  ctaBar: { padding: 18, borderTopWidth: 1, borderTopColor: colors.hairline },
  ctaBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
});
