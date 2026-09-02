import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import PlaceholderThumb from '../components/PlaceholderThumb';
import { BackIcon, ShareIcon, CalendarIcon, CarIcon } from '../components/Icons';
import { RootStackParamList } from '../navigation/types';

type WorkDetail = {
  category: string;
  title: string;
  date: string;
  model: string;
  desc: string;
  products: { brand: string; item: string }[];
  photo?: any;
  variant: number;
};

const WORK_DETAILS: Record<string, WorkDetail> = {
  'jaguar-ppf': {
    category: 'Automotive Aesthetics',
    title: 'Jaguar F-Type — Vinil Roxo Metálico',
    date: 'Concluído: 30 Ago 2026',
    model: 'Jaguar F-Type R',
    desc: 'Wrap completo em vinil roxo metálico com acabamento gloss, jantes forjadas em dourado e interior em couro teal personalizado. Um dos trabalhos mais marcantes do nosso portfólio Automotive Aesthetics.',
    products: [
      { brand: 'Inozetek', item: 'Vinil Roxo Metálico Gloss' },
      { brand: 'Xtreme Polishing Systems', item: 'Detailing final' },
    ],
    photo: require('../../assets/work-jaguar-purple.jpg'),
    variant: 0,
  },
  'showroom-epoxy': {
    category: 'Epoxy Floors',
    title: 'Metallic Epoxy — Showroom Premium',
    date: 'Concluído: 29 Ago 2026',
    model: 'Showroom · Porto',
    desc: 'Aplicação de sistema epóxi metálico em piso de showroom automóvel, com acabamento brilhante e efeito tridimensional. Resistente a químicos e abrasão, pensado para uso comercial intensivo.',
    products: [
      { brand: 'Xtreme Polishing Systems', item: 'Metallic Pigment Gold' },
      { brand: 'Xtreme Polishing Systems', item: 'Topcoat UV' },
    ],
    variant: 1,
  },
};

const DEFAULT_DETAIL: WorkDetail = {
  category: 'Marble Studios',
  title: 'Trabalho Marble Studios',
  date: '',
  model: '',
  desc: 'Detalhes deste trabalho em breve.',
  products: [],
  variant: 2,
};

type Route = RouteProp<RootStackParamList, 'WorkDetail'>;

export default function WorkDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const detail = WORK_DETAILS[route.params.workId] ?? DEFAULT_DETAIL;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon />
        </Pressable>
        <Pressable style={styles.iconBtn}>
          <ShareIcon />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {detail.photo ? (
            <ImageBackground source={detail.photo} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <PlaceholderThumb variant={detail.variant} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{detail.category}</Text>
          </View>
          <Text style={styles.heroTitle}>{detail.title}</Text>
        </View>

        <View style={styles.meta}>
          {!!detail.date && (
            <View style={styles.metaItem}>
              <CalendarIcon size={12} color={colors.gold} />
              <Text style={styles.metaText}>{detail.date}</Text>
            </View>
          )}
          {!!detail.model && (
            <View style={styles.metaItem}>
              <CarIcon size={12} color={colors.gold} />
              <Text style={styles.metaText}>{detail.model}</Text>
            </View>
          )}
        </View>

        <Text style={styles.desc}>{detail.desc}</Text>

        {detail.products.length > 0 && (
          <View style={styles.products}>
            {detail.products.map((p, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipBrand}>{p.brand}</Text>
                <Text style={styles.chipItem}> · {p.item}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  hero: { position: 'relative', margin: 18, marginTop: 12, height: 210, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  heroTitle: { position: 'absolute', left: 14, right: 14, bottom: 12, fontFamily: fonts.bodyExtraBold, fontSize: 16, color: colors.ink, lineHeight: 21 },
  meta: { flexDirection: 'row', gap: 16, paddingHorizontal: 18, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint },
  desc: { paddingHorizontal: 18, marginTop: 14, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.inkMuted },
  products: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, marginTop: 16, gap: 8 },
  chip: { flexDirection: 'row', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipBrand: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.goldBright },
  chipItem: { fontFamily: fonts.body, fontSize: 10, color: colors.inkMuted },
  ctaBar: { padding: 18, borderTopWidth: 1, borderTopColor: colors.hairline },
  ctaBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
});
