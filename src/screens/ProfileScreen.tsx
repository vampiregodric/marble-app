import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';
import PlaceholderThumb from '../components/PlaceholderThumb';
import { CameraIcon, ChevronRightIcon } from '../components/Icons';

const ASSETS = [
  { id: 'bmw', name: 'BMW M4 — PPF Colorido', sub: 'Última visita: 25 Ago 2026', status: 'Checkup', ok: false, variant: 5 },
  { id: 'showroom', name: 'Showroom — Metallic Epoxy', sub: 'Instalado: 12 Jun 2026', status: 'Em dia', ok: true, variant: 1 },
];

export default function ProfileScreen() {
  const [prefs, setPrefs] = useState({ automotive: true, epoxy: true, graphic: false });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>FP</Text>
            <View style={styles.avatarEdit}>
              <CameraIcon />
            </View>
          </View>
          <View>
            <Text style={styles.name}>Fábio Pombinho</Text>
            <Text style={styles.since}>Cliente desde Mar 2026</Text>
          </View>
        </View>

        <View style={styles.pendingCard}>
          <View style={styles.pendingTag}>
            <View style={styles.pendingDot} />
            <Text style={styles.pendingTagText}>Ação pendente</Text>
          </View>
          <Text style={styles.pendingTitle}>Checkup do teu PPF</Text>
          <Text style={styles.pendingDesc}>BMW M4 · aplicado há 8 dias. Confirma o checkup gratuito antes que a equipa te ligue.</Text>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>Agendar agora</Text>
          </Pressable>
        </View>

        <Text style={styles.secTitle}>Os teus carros & chãos</Text>
        <View style={styles.assetList}>
          {ASSETS.map((a) => (
            <View key={a.id} style={styles.assetRow}>
              <PlaceholderThumb variant={a.variant} style={styles.assetThumb} />
              <View style={styles.assetText}>
                <Text style={styles.assetName}>{a.name}</Text>
                <Text style={styles.assetSub}>{a.sub}</Text>
              </View>
              <View style={[styles.assetStatus, a.ok ? styles.assetStatusOk : styles.assetStatusPending]}>
                <Text style={[styles.assetStatusText, a.ok ? styles.assetStatusTextOk : styles.assetStatusTextPending]}>
                  {a.status}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.secTitle}>Preferências de notificação</Text>
        <View style={styles.prefList}>
          {[
            { key: 'automotive' as const, label: 'Automotive Aesthetics' },
            { key: 'epoxy' as const, label: 'Epoxy Floors' },
            { key: 'graphic' as const, label: 'Graphic Solutions' },
          ].map((p, i, arr) => (
            <Pressable
              key={p.key}
              style={[styles.prefRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setPrefs((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
            >
              <Text style={styles.prefLabel}>{p.label}</Text>
              <View style={[styles.toggle, prefs[p.key] && styles.toggleOn]}>
                <View style={[styles.toggleThumb, prefs[p.key] && styles.toggleThumbOn]} />
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.secTitle}>Conta</Text>
        <View style={styles.accountList}>
          <Pressable style={styles.accountRow}>
            <Text style={styles.accountLabel}>Dados pessoais</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={[styles.accountRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.accountLabel}>Terminar sessão</Text>
            <ChevronRightIcon />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.goldDim,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.eyebrow, fontSize: 16, color: colors.goldBright },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  since: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  pendingCard: {
    margin: 18,
    marginBottom: 0,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: 'rgba(198,161,91,0.08)',
  },
  pendingTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.goldBright },
  pendingTagText: { fontFamily: fonts.eyebrow, fontSize: 8.5, letterSpacing: 1.2, color: colors.goldBright, textTransform: 'uppercase' },
  pendingTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginBottom: 4 },
  pendingDesc: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkMuted, lineHeight: 15, marginBottom: 13 },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: '#0b0a08', textTransform: 'uppercase' },
  secTitle: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 1.6, color: colors.inkMuted, textTransform: 'uppercase', marginHorizontal: 18, marginTop: 22, marginBottom: 10 },
  assetList: { paddingHorizontal: 18, gap: 8 },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 10 },
  assetThumb: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline },
  assetText: { flex: 1 },
  assetName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  assetSub: { fontFamily: fonts.body, fontSize: 9.5, color: colors.inkFaint, marginTop: 1 },
  assetStatus: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  assetStatusOk: { borderWidth: 1, borderColor: 'rgba(183,209,168,0.35)' },
  assetStatusPending: { borderWidth: 1, borderColor: colors.hairlineStrong },
  assetStatusText: { fontFamily: fonts.eyebrow, fontSize: 7, letterSpacing: 0.6, textTransform: 'uppercase' },
  assetStatusTextOk: { color: colors.ok },
  assetStatusTextPending: { color: colors.goldBright },
  prefList: { paddingHorizontal: 18 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  prefLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.ink },
  toggle: { width: 34, height: 19, borderRadius: 10, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  toggleThumb: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.inkFaint, marginLeft: 2 },
  toggleThumbOn: { backgroundColor: '#0b0a08', marginLeft: 17 },
  accountList: { paddingHorizontal: 18, marginTop: 2, marginBottom: 24 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  accountLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
});
