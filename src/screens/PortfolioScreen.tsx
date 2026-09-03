import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import PlaceholderThumb from '../components/PlaceholderThumb';
import { RootStackParamList } from '../navigation/types';

const CATEGORIES = ['Todos', 'Automotive', 'Epoxy Floors', 'Graphic'];

const WORKS = [
  { id: 'jaguar-ppf', title: 'PPF Colorido — BMW M4', category: 'Automotive', time: 'Há 2 dias', variant: 0 },
  { id: 'showroom-epoxy', title: 'Metallic Epoxy — Showroom', category: 'Epoxy Floors', time: 'Há 4 dias', variant: 1 },
  { id: 'fleet-rebrand', title: 'Rebranding de frota', category: 'Graphic', time: 'Há 1 semana', variant: 2 },
  { id: 'audi-vinyl', title: 'Vinil Fosco — Audi RS3', category: 'Automotive', time: 'Há 1 semana', variant: 3 },
  { id: 'warehouse-flake', title: 'Flake System — Armazém', category: 'Epoxy Floors', time: 'Há 2 semanas', variant: 4 },
  { id: 'porsche-detail', title: 'Detailing completo — Porsche', category: 'Automotive', time: 'Há 3 semanas', variant: 5 },
];

export default function PortfolioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [active, setActive] = useState('Todos');
  const { width: screenW } = useWindowDimensions();
  const cardW = (screenW - 36 - 10) / 2;

  const filtered = useMemo(
    () => (active === 'Todos' ? WORKS : WORKS.filter((w) => w.category === active)),
    [active]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfólio</Text>
        <Text style={styles.subtitle}>{WORKS.length} trabalhos publicados</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsRowContent}
      >
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setActive(c)} style={[styles.chip, active === c && styles.chipActive]}>
            <Text style={[styles.chipText, active === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {filtered.map((w) => (
          <Pressable
            key={w.id}
            style={[styles.card, { width: cardW }]}
            onPress={() => navigation.navigate('WorkDetail', { workId: w.id })}
          >
            <PlaceholderThumb variant={w.variant} style={StyleSheet.absoluteFill} />
            <View style={styles.cardOverlay} />
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{w.category}</Text>
            </View>
            <View style={styles.caption}>
              <Text style={styles.captionTitle} numberOfLines={2}>{w.title}</Text>
              <Text style={styles.captionTime}>{w.time}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 21, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  chipsRow: { flexGrow: 0, flexShrink: 0, height: 40, marginTop: 14, paddingLeft: 20 },
  chipsRowContent: { alignItems: 'center', gap: 8 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.8, color: colors.inkMuted, textTransform: 'uppercase' },
  chipTextActive: { color: '#0b0a08', fontFamily: fonts.bodyBold },
  gridScroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 18, paddingBottom: 32 },
  card: { height: 148, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline },
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
