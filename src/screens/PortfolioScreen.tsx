import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import { EmptyState, ErrorState, LoadingState } from '../components/ListState';
import { usePublishedWorks } from '../data/works';
import { LOCAL_WORK_PHOTOS } from '../data/localPhotos';
import { CATEGORIES } from '../data/categories';
import { WorkCategory } from '../firebase/models';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { timeAgo } from '../utils/dates';
import { useAppWidth } from '../utils/layout';

const ALL = 'Todos';
type Filter = typeof ALL | WorkCategory;

// Portfólio público: todos os trabalhos publicados no Firestore, filtrados por
// categoria em memória. Pode chegar aqui já filtrado (cartão de departamento
// no Início → params.category).
export default function PortfolioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabParamList, 'Portfolio'>>();
  const [active, setActive] = useState<Filter>(ALL);
  const screenW = useAppWidth();
  const cardW = (screenW - 36 - 10) / 2;
  const { data: works, loading, error } = usePublishedWorks();

  useEffect(() => {
    if (route.params?.category) setActive(route.params.category);
  }, [route.params]);

  const filtered = useMemo(() => (active === ALL ? works : works.filter((w) => w.category === active)), [works, active]);

  const subtitle = loading
    ? 'A carregar…'
    : works.length === 1
      ? '1 trabalho publicado'
      : `${works.length} trabalhos publicados`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfólio</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsRowContent}
      >
        {[ALL, ...CATEGORIES.map((c) => c.key)].map((c) => (
          <Pressable key={c} onPress={() => setActive(c as Filter)} style={[styles.chip, active === c && styles.chipActive]}>
            <Text style={[styles.chipText, active === c && styles.chipTextActive]}>
              {CATEGORIES.find((m) => m.key === c)?.label ?? c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={active === ALL ? 'Ainda não há trabalhos publicados.' : 'Ainda não há trabalhos nesta categoria.'}
          description="Assim que a equipa publicar um trabalho novo, aparece aqui."
          actionLabel={active === ALL ? undefined : 'Ver todos'}
          onAction={active === ALL ? undefined : () => setActive(ALL)}
        />
      ) : (
        <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {filtered.map((w) => (
            <Pressable
              key={w.id}
              style={[styles.card, { width: cardW }]}
              onPress={() => navigation.navigate('WorkDetail', { workId: w.id })}
              accessibilityRole="button"
              accessibilityLabel={w.title}
            >
              <Photo url={w.photoUrl} fallback={LOCAL_WORK_PHOTOS[w.id]} seed={w.id} />
              <View style={styles.cardOverlay} />
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{CATEGORIES.find((m) => m.key === w.category)?.label ?? w.category}</Text>
              </View>
              <View style={styles.caption}>
                <Text style={styles.captionTitle} numberOfLines={2}>
                  {w.title}
                </Text>
                <Text style={styles.captionTime}>{timeAgo(w.completedAt)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 21, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  chipsRow: { flexGrow: 0, flexShrink: 0, height: 40, marginTop: 14, paddingLeft: 20 },
  chipsRowContent: { alignItems: 'center', gap: 8, paddingRight: 20 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.8, color: colors.inkMuted, textTransform: 'uppercase' },
  chipTextActive: { color: '#0b0a08', fontFamily: fonts.bodyBold },
  gridScroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 18, paddingBottom: 32 },
  card: { height: 148, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.panel2 },
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  catBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  catBadgeText: { fontFamily: fonts.eyebrow, fontSize: 7, letterSpacing: 0.6, color: colors.goldBright, textTransform: 'uppercase' },
  caption: { position: 'absolute', left: 10, right: 10, bottom: 9 },
  captionTitle: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.ink, lineHeight: 15 },
  captionTime: { fontFamily: fonts.body, fontSize: 9, color: colors.inkMuted, marginTop: 2 },
});
