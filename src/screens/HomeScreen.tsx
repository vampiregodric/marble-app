import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import PlaceholderThumb from '../components/PlaceholderThumb';
import { useFeaturedWorks } from '../data/works';
import { useHomeSettings } from '../data/settings';
import { categoryFullName } from '../data/categories';
import { DEPARTMENTS } from '../data/departments';
import { hasDepartmentContent } from '../data/departmentContent';
import { WorkCategory } from '../firebase/models';
import { RootStackParamList } from '../navigation/types';
import { useAppWidth } from '../utils/layout';
import { cloudinaryWhole } from '../media/cloudinary';
import { useT } from '../i18n';

// Ordem do Início (decisão do Fábio, 2026-09-09): logótipo em cima, sem
// traço; a seguir UMA linha fina que acaba no rótulo "Os nossos serviços"
// ("———— OS NOSSOS SERVIÇOS", desenho dele); logo os seis cartões de
// departamento e, em baixo, o carrossel dos destaques, que fica com TODO o
// espaço que sobrar até à barra de tabs (até CAROUSEL_MAX).
// O ecrã tem de caber sem scroll: se faltar espaço, primeiro encolhe o
// carrossel até 120; se ainda não chegar, encolhem os cartões, de 122 até
// 100. Só num telemóvel muito baixo (iPhone SE) sobra um resto para
// deslizar. As parcelas fixas espelham os estilos lá em baixo — se mudares
// uma altura ou margem, muda aqui.
const CAROUSEL_MAX = 260;
const CAROUSEL_MIN = 120;
const DEPT_CARD_MAX = 122;
const DEPT_CARD_MIN = 100;
// Cabeçalho (6 + logo 56 + 8, sem traço) + rótulo da grelha (8 + ~14 + 10)
// + os dois intervalos entre filas (2 × 10) + margem do carrossel (18) +
// pontos (8 + 5 + 16 de fim) + 4 de folga.
const HOME_FIXED = 70 + 32 + 20 + 18 + 29 + 4;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Nome do departamento numa só linha (pedido do Fábio, 2026-09-09, para o
// texto não tapar a foto). Estimativa pelo número de caracteres — a Manrope
// Bold mede 0,50 a 0,54 em por carácter nestes nomes (medido no browser);
// usa-se 0,54 com 5% de folga, igual em todas as plataformas (sem
// adjustsFontSizeToFit, que no Android encolhe de forma imprevisível).
// Decisão do Fábio (2026-09-09): os nomes têm TODOS o mesmo tamanho — o que
// o segundo nome mais comprido ("Automotive Aesthetics") precisa para caber
// — e só o mais comprido ("Xtreme Polishing Systems") fica mais pequeno,
// porque é o que é preciso para caber numa linha.
const DEPT_NAME_MAX = 12.5;
const DEPT_NAME_MIN = 9.5;
const DEPT_NAME_EM_PER_CHAR = 0.54;
function fittingSize(name: string, textWidth: number): number {
  return clamp((textWidth * 0.95) / (name.length * DEPT_NAME_EM_PER_CHAR), DEPT_NAME_MIN, DEPT_NAME_MAX);
}
// Tamanho de cada nome: o comum a todos, menos o mais comprido (fica com o dele).
function deptNameSizes(names: string[], textWidth: number): Map<string, number> {
  const own = names.map((n) => fittingSize(n, textWidth));
  const sorted = [...own].sort((a, b) => a - b);
  const shared = sorted[1] ?? sorted[0] ?? DEPT_NAME_MAX;
  return new Map(names.map((n, i) => [n, Math.min(shared, own[i])]));
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const T = useT();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const screenW = useAppWidth();
  const carouselW = screenW - 36;
  // Grelha alinhada com o carrossel e o rótulo: 18 px de cada lado, 10 entre
  // cartões (o Fábio notou o rótulo a acabar à direita dos cartões, 2026-09-09).
  const deptCardW = Math.floor((screenW - 36 - 10) / 2);
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // A barra de tabs já inclui a zona segura de baixo (RootNavigator).
  const tabBarH = useBottomTabBarHeight();
  // Espaço para o carrossel mais as três filas de cartões.
  const free = windowH - insets.top - tabBarH - HOME_FIXED;
  const carouselH = Math.round(clamp(free - 3 * DEPT_CARD_MAX, CAROUSEL_MIN, CAROUSEL_MAX));
  const deptCardH = Math.floor(clamp((free - carouselH) / 3, DEPT_CARD_MIN, DEPT_CARD_MAX));
  // Os slides vivem dentro do contorno de 1 px do carrossel.
  const slideW = carouselW - 2;
  const slideH = carouselH - 2;
  // Largura útil do nome: cartão menos as bordas (2) e o padding (24).
  const nameSizes = useMemo(() => deptNameSizes(DEPARTMENTS.map((d) => d.name), deptCardW - 26), [deptCardW]);

  // Carrossel: destaques escolhidos pela equipa (works.featured), em tempo real.
  const { data: featured, loading } = useFeaturedWorks(5);
  // Fotos dos cartões de departamento, escolhidas pela equipa no backoffice
  // (settings/home). Sem foto, o cartão fica no gradiente — nunca um ícone.
  const { data: home } = useHomeSettings();
  const covers = home?.departmentCovers ?? {};

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / slideW);
    if (idx !== activeSlide) setActiveSlide(idx);
  };

  const openPortfolio = (category?: WorkCategory) =>
    navigation.navigate('Tabs', { screen: 'Portfolio', params: category ? { category } : undefined });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Cabeçalho só com o logótipo. Os atalhos para Alertas e Perfil que
          aqui estavam saíram a 2026-09-09 (decisão do Fábio): duplicavam as
          tabs de baixo, que já mostram o número de alertas por ler. */}
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Rótulo da grelha: uma linha fina e, no fim dela, o texto — a única
            linha por baixo do logótipo (o cabeçalho não tem traço). Desenho
            do Fábio, 2026-09-09: "———— OS NOSSOS SERVIÇOS". */}
        <View style={styles.gridLabelRow}>
          <View style={styles.gridLabelLine} />
          <Text style={styles.gridLabel}>{T.home.servicesLabel}</Text>
        </View>

        {/* Cartões de departamento: foto escolhida pela equipa como fundo,
            nome e tagline por cima. O selo "Oficial" é informação (Xtreme é
            distribuidor oficial), por isso fica. Tocar abre a página de
            serviços do departamento (Secção 9) — decisão do Fábio: serviços
            primeiro, o Portfólio filtrado fica a um toque dentro da página.
            Sem conteúdo (Xtreme até à Secção 10) o cartão fica inerte.
            A foto enche o cartão (cover, thumbnail 4:3) — o Fábio
            experimentou a foto inteira e voltou atrás (2026-09-09). O nome
            fica numa só linha (deptNameSizes), para não tapar a imagem. */}
        <View style={styles.deptGrid}>
          {DEPARTMENTS.map((d) => {
            const cover = covers[d.id];
            return (
              <Pressable
                key={d.id}
                style={[styles.deptCard, { width: deptCardW, height: deptCardH }]}
                onPress={hasDepartmentContent(d.id) ? () => navigation.navigate('Department', { id: d.id }) : undefined}
                accessibilityRole="button"
                accessibilityLabel={d.name}
              >
                <Photo url={cover?.thumbnailUrl || cover?.photoUrl} seed={d.id} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.deptText}>
                  <Text style={[styles.deptName, { fontSize: nameSizes.get(d.name) ?? DEPT_NAME_MAX }]} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={styles.deptTagline} numberOfLines={1}>
                    {d.tagline}
                  </Text>
                </View>
                {d.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{d.badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={[styles.carousel, { width: carouselW, height: carouselH }]}
        >
          {loading ? (
            <View style={[styles.slide, { width: slideW, height: slideH }]}>
              <PlaceholderThumb variant={2} style={StyleSheet.absoluteFill} />
            </View>
          ) : featured.length === 0 ? (
            <Pressable style={[styles.slide, { width: slideW, height: slideH }]} onPress={() => openPortfolio()}>
              <PlaceholderThumb variant={0} style={StyleSheet.absoluteFill} />
              <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
                  locations={[0.4, 0.72, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              <View style={styles.slideText}>
                <Text style={styles.slideTitle}>{T.home.featuredSoon}</Text>
                <Text style={styles.slideSub}>{T.common.brand}</Text>
              </View>
            </Pressable>
          ) : (
            featured.map((w) => (
              <Pressable
                key={w.id}
                style={[styles.slide, { width: slideW, height: slideH }]}
                onPress={() => navigation.navigate('WorkDetail', { workId: w.id })}
                accessibilityRole="button"
                accessibilityLabel={w.title}
              >
                {/* Foto do trabalho INTEIRA (decisão do Fábio, 2026-09-09); a
                    margem que sobrar fica no fundo escuro do carrossel. */}
                <Photo url={cloudinaryWhole(w.photoUrl, 1000)} seed={w.id} fit="contain" />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
                  locations={[0.4, 0.72, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.slideText}>
                  {/* Mesmo formato dos cartões de cima: título a negrito e a
                      categoria por baixo, sem "Concluído" (Fábio, 2026-09-09:
                      se está exposto, está concluído). */}
                  <Text style={styles.slideTitle} numberOfLines={2}>
                    {w.title}
                  </Text>
                  <Text style={styles.slideSub} numberOfLines={1}>
                    {categoryFullName(w.category)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
        {/* Experiência de 2026-09-09 (Fábio): o carrossel dos destaques fica
            por baixo do menu dos departamentos. */}
        {featured.length > 1 ? (
          <View style={styles.dots}>
            {featured.map((w, i) => (
              <View key={w.id} style={[styles.pageDot, i === activeSlide && styles.pageDotActive]} />
            ))}
          </View>
        ) : (
          <View style={styles.dotsSpacer} />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  // A altura (6 + 56 + 8 = 70) entra em HOME_FIXED. Sem traço por baixo: a
  // linha fina é a do rótulo da grelha, logo a seguir.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  logo: { height: 56, width: 100 },
  // A altura vem de carouselH (CAROUSEL_MIN..CAROUSEL_MAX), no próprio JSX.
  // Contorno igual ao dos cartões e gradiente só em baixo (em vez do véu
  // uniforme a 35%) — revisão crítica aceite pelo Fábio, 2026-09-09.
  carousel: { marginTop: 18, marginHorizontal: 18, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline },
  slide: { position: 'relative' },
  // Texto do carrossel no formato dos cartões de departamento (deptName/deptTagline).
  slideText: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  slideTitle: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink, marginBottom: 2 },
  slideSub: { fontFamily: fonts.body, fontSize: 10, color: colors.inkMuted },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8, height: 5, marginBottom: 16 },
  dotsSpacer: { height: 5, marginTop: 8, marginBottom: 16 },
  pageDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  pageDotActive: { backgroundColor: colors.goldBright, width: 14 },
  gridLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 8, marginBottom: 10 },
  gridLabelLine: { flex: 1, height: 1, backgroundColor: colors.hairline },
  gridLabel: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 2, color: colors.inkMuted },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, gap: 10 },
  // A altura vem de deptCardH (DEPT_CARD_MIN..DEPT_CARD_MAX), no próprio JSX.
  deptCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel2,
    justifyContent: 'flex-end',
  },
  deptText: { padding: 12 },
  // fontSize vem de deptNameSizes() no JSX (DEPT_NAME_MIN..DEPT_NAME_MAX).
  deptName: { fontFamily: fonts.bodyBold, color: colors.ink, marginBottom: 2 },
  deptTagline: { fontFamily: fonts.body, fontSize: 10, color: colors.inkMuted },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 1, color: colors.goldBright, textTransform: 'uppercase' },
});
