import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import { EmptyState, ErrorState, LoadingState } from '../components/ListState';
import { LocationIcon } from '../components/Icons';
import { useEvents } from '../data/events';
import { MarbleEvent } from '../firebase/models';
import { monthShort, isSameDay } from '../utils/dates';
import { S, useT } from '../i18n';

const FILTERS = ['upcoming', 'past'] as const;
type Filter = (typeof FILTERS)[number];

function statusOf(e: MarbleEvent, past: boolean): string {
  if (past) return S.events.statusDone;
  if (e.date && isSameDay(e.date.toDate(), new Date())) return S.events.statusToday;
  return S.events.statusSoon;
}

// Eventos onde a Marble Studios vai estar (feiras, car meets, open days).
// Público, sem login. Só a equipa cria eventos (backoffice, Secção 5).
export default function EventsScreen() {
  const [active, setActive] = useState<Filter>('upcoming');
  const { upcoming, past, loading, error } = useEvents();
  const showingPast = active === 'past';
  const list = showingPast ? past : upcoming;
  const T = useT();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{T.events.title}</Text>
        <Text style={styles.subtitle}>{T.events.subtitle}</Text>
      </View>

      <View style={styles.chipsRow}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setActive(f)} style={[styles.chip, active === f && styles.chipActive]}>
            <Text style={[styles.chipText, active === f && styles.chipTextActive]}>{f === 'past' ? T.events.past : T.events.upcoming}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : list.length === 0 ? (
        <EmptyState
          title={showingPast ? T.events.emptyPast : T.events.emptyUpcoming}
          description={showingPast ? T.events.emptyPastDesc : T.events.emptyUpcomingDesc}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {list.map((e) => {
            const d = e.date?.toDate();
            return (
              <View key={e.id} style={styles.card}>
                <View style={styles.photo}>
                  <Photo url={e.photoUrl} seed={e.id} />
                  <View style={styles.photoOverlay} />
                  {d ? (
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateDay}>{String(d.getDate()).padStart(2, '0')}</Text>
                      <Text style={styles.dateMon}>{monthShort(d.getMonth())}</Text>
                    </View>
                  ) : null}
                  <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, showingPast && styles.statusTextPast]}>{statusOf(e, showingPast)}</Text>
                  </View>
                </View>
                <View style={styles.body}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  {e.location ? (
                    <View style={styles.metaRow}>
                      <LocationIcon size={11} color={colors.gold} />
                      <Text style={styles.metaText}>{e.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
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
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  chip: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.8, color: colors.inkMuted, textTransform: 'uppercase' },
  chipTextActive: { color: '#0b0a08', fontFamily: fonts.bodyBold },
  list: { padding: 18, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, overflow: 'hidden' },
  photo: { height: 110, backgroundColor: colors.panel2 },
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
  statusText: { fontFamily: fonts.eyebrow, fontSize: 7, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  statusTextPast: { color: colors.inkFaint },
  body: { padding: 13 },
  eventTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.body, fontSize: 10, color: colors.inkFaint },
});
