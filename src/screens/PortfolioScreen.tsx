import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import { EmptyState, ErrorState, LoadingState } from '../components/ListState';
import { brandKey, brandOptions, hasBrand, hasService, usePublishedWorks } from '../data/works';
import { CATEGORIES } from '../data/categories';
import { WORK_SERVICES, WorkCategory, WorkServiceId, workServicesOf } from '../firebase/models';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { timeAgo } from '../utils/dates';
import { useAppWidth } from '../utils/layout';
import { useT } from '../i18n';

// Chave interna do filtro "Todos" (o rótulo vem de i18n).
const ALL = 'all';
type Filter = typeof ALL | WorkCategory;

// Portfólio público: todos os trabalhos publicados no Firestore, filtrados por
// categoria em memória. Pode chegar aqui já filtrado: a página de um
// departamento manda `params.category` ("Ver portfólio"), um cartão de
// "O que fazemos" manda também `params.service` (Secção 14) e uma tag do
// Detalhe manda `params.brand` (Secção 17). Dentro de uma categoria há um
// segundo filtro, pelo sistema/serviço (Secção 13: `works.services`) — só
// aparecem os que têm trabalhos publicados; em "Todos" não há segunda fila.
// A terceira fila é a marca (`works.brands`, Secção 17): aparece em
// qualquer recorte, incluindo "Todos" (as marcas atravessam categorias), só
// com as marcas que têm trabalhos no recorte atual, e combina-se com o
// serviço (E). Trabalhos sem marca só se veem sem marca escolhida.
export default function PortfolioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabParamList, 'Portfolio'>>();
  const [active, setActive] = useState<Filter>(ALL);
  const [service, setService] = useState<WorkServiceId | null>(null);
  // Chave da marca pedida (brandKey). Só conta quando existe no recorte
  // atual — ver `brand` abaixo — o que também cobre o URL à mão com uma
  // marca que ninguém usou, e a chegada antes de os trabalhos carregarem.
  const [brandWanted, setBrandWanted] = useState<string | null>(null);
  const screenW = useAppWidth();
  const cardW = (screenW - 36 - 10) / 2;
  const { data: works, loading, error } = usePublishedWorks();
  const T = useT();

  // Mudar de categoria limpa o serviço (as listas são por categoria) e a
  // marca (o recorte muda por completo).
  const choose = (c: Filter) => {
    setActive(c);
    setService(null);
    setBrandWanted(null);
  };

  // Params de chegada. Na web vêm da query string e podem ser qualquer
  // coisa: uma categoria desconhecida é ignorada; um serviço só entra se
  // pertencer à categoria (e, sem categoria, dá a dele); a marca sozinha
  // aplica-se em "Todos".
  useEffect(() => {
    const p = route.params;
    if (!p) return;
    const wanted = p.category ?? WORK_SERVICES.find((s) => s.id === p.service)?.category;
    const category = wanted && CATEGORIES.some((c) => c.key === wanted) ? wanted : null;
    const brand = typeof p.brand === 'string' ? brandKey(p.brand) : '';
    if (!category && !brand) return;
    if (category) {
      setActive(category);
      setService(p.service && workServicesOf(category).some((s) => s.id === p.service) ? p.service : null);
    } else {
      setActive(ALL);
      setService(null);
    }
    setBrandWanted(brand || null);
  }, [route.params]);

  const inCategory = useMemo(() => (active === ALL ? works : works.filter((w) => w.category === active)), [works, active]);
  const serviceOptions = useMemo(
    () => (active === ALL ? [] : workServicesOf(active).filter((s) => inCategory.some((w) => hasService(w, s.id)))),
    [active, inCategory]
  );
  const inService = useMemo(() => (service ? inCategory.filter((w) => hasService(w, service)) : inCategory), [inCategory, service]);
  // Marcas do recorte atual (categoria + serviço), mais trabalhos primeiro.
  const brandChoices = useMemo(() => brandOptions(inService), [inService]);
  const brand = brandWanted && brandChoices.some((b) => b.key === brandWanted) ? brandWanted : null;
  const filtered = useMemo(() => (brand ? inService.filter((w) => hasBrand(w, brand)) : inService), [inService, brand]);

  // Mudar de serviço mantém a marca se ela continuar a ter trabalhos no
  // recorte novo; senão larga-a (em vez de mostrar um Portfólio vazio).
  const chooseService = (s: WorkServiceId | null) => {
    setService(s);
    if (brandWanted) {
      const next = s ? inCategory.filter((w) => hasService(w, s)) : inCategory;
      if (!next.some((w) => hasBrand(w, brandWanted))) setBrandWanted(null);
    }
  };

  const subtitle = loading ? T.common.loading : T.portfolio.count(works.length);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{T.portfolio.title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsRowContent}
      >
        {[ALL, ...CATEGORIES.map((c) => c.key)].map((c) => {
          const label = c === ALL ? T.portfolio.all : (CATEGORIES.find((m) => m.key === c)?.label ?? c);
          return (
            <Pressable
              key={c}
              onPress={() => choose(c as Filter)}
              style={[styles.chip, active === c && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active === c }}
              accessibilityLabel={label}
            >
              <Text style={[styles.chipText, active === c && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {serviceOptions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subRow} contentContainerStyle={styles.chipsRowContent}>
          {serviceOptions.map((s) => {
            const on = service === s.id;
            const label = T.workServices[s.id];
            return (
              <Pressable
                key={s.id}
                onPress={() => chooseService(on ? null : s.id)}
                style={[styles.subChip, on && styles.subChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label}
              >
                <Text style={[styles.subChipText, on && styles.subChipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {brandChoices.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subRow} contentContainerStyle={styles.chipsRowContent}>
          {brandChoices.map((b) => {
            const on = brand === b.key;
            return (
              <Pressable
                key={b.key}
                onPress={() => setBrandWanted(on ? null : b.key)}
                style={[styles.subChip, on && styles.subChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={T.work.brandA11y(b.label)}
              >
                <Text style={[styles.subChipText, on && styles.subChipTextActive]}>{b.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={active === ALL ? T.portfolio.emptyAll : service ? T.portfolio.emptyService : T.portfolio.emptyCategory}
          description={T.portfolio.emptyDesc}
          actionLabel={active === ALL ? undefined : service ? T.portfolio.seeCategory : T.portfolio.seeAll}
          onAction={active === ALL ? undefined : service ? () => chooseService(null) : () => choose(ALL)}
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
              <Photo url={w.photoUrl} seed={w.id} />
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
  // Segunda fila (Secção 13): sistema/serviço dentro da categoria. Mais
  // discreta do que a primeira — contorno dourado em vez de fundo cheio. A
  // terceira fila (Secção 17: marcas) usa exatamente o mesmo estilo; o que
  // as distingue é o conteúdo (serviços vs. nomes de marcas).
  subRow: { flexGrow: 0, flexShrink: 0, height: 32, marginTop: 8, paddingLeft: 20 },
  subChip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.hairline, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5 },
  subChipActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,161,91,0.14)' },
  subChipText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted },
  subChipTextActive: { fontFamily: fonts.bodyBold, color: colors.goldBright },
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
