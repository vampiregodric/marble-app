import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';
import PlaceholderThumb from '../components/PlaceholderThumb';
import { LocationIcon } from '../components/Icons';

const FILTERS = ['Próximos', 'Passados'];

const EVENTS = [
  { id: 'auto-expo', day: '15', month: 'Set', status: 'Em breve', title: 'Auto Expo Lisboa 2026', location: 'FIL — Parque das Nações, Lisboa', variant: 0, past: false },
  { id: 'car-coffee', day: '05', month: 'Set', status: 'Em breve', title: 'Car & Coffee Aveiro', location: 'Rossio, Aveiro', variant: 1, past: false },
  { id: 'open-day', day: '10', month: 'Ago', status: 'Concluído', title: 'Open Day — Novo Espaço', location: 'Marble Studios HQ', variant: 2, past: true },
];

export default function EventsScreen() {
  const [active, setActive] = useState('Próximos');
  const list = EVENTS.filter((e) => (active === 'Próximos' ? !e.past : e.past));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Eventos</Text>
        <Text style={styles.subtitle}>Onde nos vais encontrar</Text>
      </View>

      <View style={styles.chipsRow}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setActive(f)} style={[styles.chip, active === f && styles.chipActive]}>
            <Text style={[styles.chipText, active === f && styles.chipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {list.map((e) => (
          <View key={e.id} style={styles.card}>
            <View style={styles.photo}>
              <PlaceholderThumb variant={e.variant} style={StyleSheet.absoluteFill} />
              <View style={styles.photoOverlay} />
              <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>{e.day}</Text>
                <Text style={styles.dateMon}>{e.month}</Text>
              </View>
              <View style={[styles.statusBadge, e.past && styles.statusBadgePast]}>
                <Text style={[styles.statusText, e.past && styles.statusTextPast]}>{e.status}</Text>
              </View>
            </View>
            <View style={styles.body}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <View style={styles.metaRow}>
                <LocationIcon size={11} color={colors.gold} />
                <Text style={styles.metaText}>{e.location}</Text>
              </View>
            </View>
          </View>
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
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  chip: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.8, color: colors.inkMuted, textTransform: 'uppercase' },
  chipTextActive: { color: '#0b0a08', fontFamily: fonts.bodyBold },
  list: { padding: 18, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, overflow: 'hidden' },
  photo: { height: 110 },
  photoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  dateBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignItems: 'center',
  },
  dateDay: { fontFamily: fonts.bodyExtraBold, fontSize: 15, color: colors.goldBright, lineHeight: 16 },
  dateMon: { fontFamily: fonts.eyebrow, fontSize: 7, letterSpacing: 1, color: colors.inkMuted, textTransform: 'uppercase' },
  statusBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgePast: {},
  statusText: { fontFamily: fonts.eyebrow, fontSize: 7, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  statusTextPast: { color: colors.inkFaint },
  body: { padding: 13 },
  eventTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.body, fontSize: 10, color: colors.inkFaint },
});
