import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import { CarIcon, DropletIcon, PenIcon, SparkIcon, TrendUpIcon, BoxIcon, BellIcon, UserIcon } from '../components/Icons';
import PlaceholderThumb from '../components/PlaceholderThumb';
import { RootStackParamList } from '../navigation/types';

const slides = [
  { id: 's1', tag: 'Automotive · Concluído', title: 'PPF Colorido — entrega de hoje', variant: 0 },
  { id: 's2', tag: 'Epoxy · Showroom', title: 'Metallic Epoxy — piso industrial', variant: 1 },
  { id: 's3', tag: 'Graphic Solutions', title: 'Nova identidade de frota', variant: 2 },
];

const departments = [
  { id: 'automotive', name: 'Automotive Aesthetics', tagline: 'PPF, vinil & detailing', Icon: CarIcon },
  { id: 'epoxy', name: 'Epoxy Floors', tagline: 'Metallic, flake & solid', Icon: DropletIcon },
  { id: 'graphic', name: 'Graphic Solutions', tagline: 'Identidade & impressão', Icon: PenIcon },
  { id: 'ai', name: 'AI Business', tagline: 'Consultoria & automação com IA', Icon: SparkIcon },
  { id: 'ads', name: 'Marble Ads', tagline: 'Google Ads & Meta Ads', Icon: TrendUpIcon },
  { id: 'xps', name: 'Xtreme Polishing Systems', tagline: 'Buy your epoxy here', Icon: BoxIcon, badge: 'Oficial' },
];

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenW } = useWindowDimensions();
  const carouselW = screenW - 36;
  const deptCardW = (screenW - 26 - 10) / 2 - 5;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / carouselW);
    if (idx !== activeSlide) setActiveSlide(idx);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerIcons}>
          <View style={styles.iconBtn}>
            <BellIcon size={15} color={colors.gold} />
            <View style={styles.dot} />
          </View>
          <View style={styles.iconBtn}>
            <UserIcon size={15} color={colors.gold} />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={[styles.carousel, { width: carouselW }]}
        >
          {slides.map((s) => (
            <View key={s.id} style={[styles.slide, { width: carouselW }]}>
              <PlaceholderThumb variant={s.variant} style={StyleSheet.absoluteFill} />
              <View style={styles.slideOverlay} />
              <View style={styles.slideText}>
                <Text style={styles.slideTag}>{s.tag}</Text>
                <Text style={styles.slideTitle}>{s.title}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.id} style={[styles.pageDot, i === activeSlide && styles.pageDotActive]} />
          ))}
        </View>

        <View style={styles.gridLabelRow}>
          <Text style={styles.gridLabel}>OS NOSSOS SERVIÇOS</Text>
          <View style={styles.gridLabelLine} />
        </View>

        <View style={styles.deptGrid}>
          {departments.map((d) => (
            <Pressable key={d.id} style={[styles.deptCard, { width: deptCardW }]}>
              <d.Icon size={26} color={colors.gold} />
              <View>
                <Text style={styles.deptName}>{d.name}</Text>
                <Text style={styles.deptTagline}>{d.tagline}</Text>
              </View>
              {d.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{d.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  logo: { height: 56, width: 100 },
  headerIcons: { flexDirection: 'row', gap: 14 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.goldBright,
  },
  carousel: { height: 168, marginTop: 16, marginHorizontal: 18, borderRadius: 18, overflow: 'hidden' },
  slide: { height: 168, position: 'relative' },
  slideOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  slideText: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  slideTag: {
    fontFamily: fonts.eyebrow,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.goldBright,
    marginBottom: 4,
  },
  slideTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  pageDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  pageDotActive: { backgroundColor: colors.goldBright, width: 14 },
  gridLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 22, marginBottom: 12 },
  gridLabel: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 2, color: colors.inkMuted },
  gridLabelLine: { flex: 1, height: 1, backgroundColor: colors.hairline },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 13, gap: 10, paddingBottom: 24 },
  deptCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    padding: 14,
    minHeight: 88,
    gap: 20,
  },
  deptName: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink, marginBottom: 2 },
  deptTagline: { fontFamily: fonts.body, fontSize: 10, color: colors.inkFaint },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 1, color: colors.goldDim, textTransform: 'uppercase' },
});
