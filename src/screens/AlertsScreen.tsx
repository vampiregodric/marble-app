import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';
import PlaceholderThumb from '../components/PlaceholderThumb';

type Alert = {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  variant: number;
};

const ALERTS: Alert[] = [
  {
    id: 'checkup',
    title: 'Checkup pendente',
    desc: 'O teu PPF (BMW M4) está pronto para o checkup gratuito. Confirma antes que a equipa te ligue.',
    time: 'Há 2 horas',
    unread: true,
    variant: 5,
  },
  {
    id: 'new-work',
    title: 'Novo trabalho publicado',
    desc: 'Acabámos de publicar um novo Metallic Epoxy no portfólio — vai espreitar.',
    time: 'Ontem',
    unread: true,
    variant: 1,
  },
  {
    id: 'wash',
    title: 'Lavagem grátis disponível',
    desc: 'O teu BMW M4 já passou um mês do checkup — tens uma lavagem grátis à espera.',
    time: 'Há 3 dias',
    unread: false,
    variant: 5,
  },
  {
    id: 'event',
    title: 'Auto Expo Lisboa 2026',
    desc: 'É já a 15 de Setembro. Vemo-nos lá?',
    time: 'Há 5 dias',
    unread: false,
    variant: 0,
  },
];

export default function AlertsScreen() {
  const unreadCount = ALERTS.filter((a) => a.unread).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertas</Text>
        <Text style={styles.subtitle}>{unreadCount} por ler</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {ALERTS.map((a) => (
          <View key={a.id} style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{a.title}</Text>
              <View style={styles.rowContent}>
                <View style={styles.rowText}>
                  <Text style={styles.rowDesc}>{a.desc}</Text>
                  <Text style={styles.rowTime}>{a.time}</Text>
                </View>
                <PlaceholderThumb variant={a.variant} style={styles.thumb} />
              </View>
            </View>
            {a.unread && <View style={styles.unreadDot} />}
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
  list: { padding: 18, gap: 8, paddingBottom: 32 },
  row: {
    position: 'relative',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    padding: 12,
  },
  rowBody: {},
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink, marginBottom: 7 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1 },
  rowDesc: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkMuted, lineHeight: 15 },
  rowTime: { fontFamily: fonts.body, fontSize: 8.5, color: colors.inkFaint, marginTop: 6 },
  thumb: { width: 44, height: 44, borderRadius: 9, borderWidth: 1, borderColor: colors.hairline },
  unreadDot: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.goldBright,
  },
});
