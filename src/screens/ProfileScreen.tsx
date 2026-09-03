import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timestamp } from 'firebase/firestore';
import { colors, fonts } from '../theme/theme';
import PlaceholderThumb from '../components/PlaceholderThumb';
import { CameraIcon, ChevronRightIcon } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { authErrorMessage } from '../auth/errors';
import { Client } from '../firebase/models';
import { RootStackParamList } from '../navigation/types';

// Carros/chãos e "ação pendente" continuam com dados de exemplo — passam a
// vir do Firestore na Secção 4. Cabeçalho, notificações e conta já são reais.
const ASSETS = [
  { id: 'bmw', name: 'BMW M4 — PPF Colorido', sub: 'Última visita: 25 Ago 2026', status: 'Checkup', ok: false, variant: 5 },
  { id: 'showroom', name: 'Showroom — Metallic Epoxy', sub: 'Instalado: 12 Jun 2026', status: 'Em dia', ok: true, variant: 1 },
];

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatSince(ts?: Timestamp | null) {
  if (!ts) return null;
  const d = ts.toDate();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

type PrefKey = keyof Client['notificationPrefs'];

const CATEGORIES: { key: PrefKey; label: string }[] = [
  { key: 'automotive', label: 'Automotive Aesthetics' },
  { key: 'epoxy', label: 'Epoxy Floors' },
  { key: 'graphic', label: 'Graphic Solutions' },
];

function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.toggle, on && styles.toggleOn]}>
      <View style={[styles.toggleThumb, on && styles.toggleThumbOn]} />
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, client, updateClient, setMarketingConsent, acceptTerms, needsTermsAcceptance, signOut } = useAuth();
  // Guarda o toggle localmente enquanto o Firestore confirma, para não saltar.
  const [pendingPrefs, setPendingPrefs] = useState<Partial<Client['notificationPrefs']>>({});
  const [pendingMarketing, setPendingMarketing] = useState<boolean | null>(null);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  const displayName = client?.name || user?.displayName || user?.email || '';
  const since = formatSince(client?.clientSince);
  const prefs: Client['notificationPrefs'] = {
    automotive: true,
    epoxy: true,
    graphic: true,
    ...client?.notificationPrefs,
    ...pendingPrefs,
  };
  // Opt-in de marketing: desligado até o cliente ligar (RGPD, Secção 3).
  const marketing = pendingMarketing ?? client?.consent?.marketing ?? false;

  const togglePref = async (key: PrefKey) => {
    const next = !prefs[key];
    setPendingPrefs((p) => ({ ...p, [key]: next }));
    try {
      await updateClient({ notificationPrefs: { ...prefs, [key]: next } });
    } finally {
      setPendingPrefs((p) => {
        const { [key]: _drop, ...rest } = p;
        return rest;
      });
    }
  };

  const toggleMarketing = async () => {
    const next = !marketing;
    setPendingMarketing(next);
    try {
      await setMarketingConsent(next);
    } finally {
      setPendingMarketing(null);
    }
  };

  const onAcceptTerms = async () => {
    setAcceptingTerms(true);
    setTermsError(null);
    try {
      await acceptTerms();
    } catch (err) {
      setTermsError(authErrorMessage(err));
    } finally {
      setAcceptingTerms(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(displayName)}</Text>
            <View style={styles.avatarEdit}>
              <CameraIcon />
            </View>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.since}>{since ? `Cliente desde ${since}` : user?.email}</Text>
          </View>
        </View>

        {needsTermsAcceptance && (
          <View style={styles.termsCard}>
            <Text style={styles.termsTitle}>Termos e privacidade atualizados</Text>
            <Text style={styles.termsDesc}>
              Para continuares a usar a tua conta precisamos que leias e aceites a versão atual dos{' '}
              <Text style={styles.inlineLink} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
                Termos de utilização
              </Text>{' '}
              e da{' '}
              <Text style={styles.inlineLink} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
                Política de privacidade
              </Text>
              .
            </Text>
            {termsError && <Text style={styles.termsError}>{termsError}</Text>}
            <Pressable style={[styles.cta, acceptingTerms && { opacity: 0.6 }]} onPress={onAcceptTerms} disabled={acceptingTerms}>
              {acceptingTerms ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>Li e aceito</Text>}
            </Pressable>
          </View>
        )}

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

        <Text style={styles.secTitle}>Notificações</Text>
        <View style={styles.prefList}>
          {/* Operacionais: fazem parte do serviço, não dependem de consentimento. */}
          <View style={styles.prefRow}>
            <View style={styles.prefText}>
              <Text style={styles.prefLabel}>Lembretes dos teus carros e chãos</Text>
              <Text style={styles.prefHint}>Checkups e contactos sobre trabalhos teus. Fazem parte do serviço.</Text>
            </View>
            <View style={styles.alwaysOn}>
              <Text style={styles.alwaysOnText}>Sempre</Text>
            </View>
          </View>

          {/* Marketing: opt-in explícito, desligado por defeito (RGPD). */}
          <Pressable
            style={[styles.prefRow, !marketing && { borderBottomWidth: 0 }]}
            onPress={toggleMarketing}
            disabled={!client}
            accessibilityRole="switch"
            accessibilityState={{ checked: marketing }}
          >
            <View style={styles.prefText}>
              <Text style={styles.prefLabel}>Ofertas e novidades</Text>
              <Text style={styles.prefHint}>Novos trabalhos no portfólio, eventos e ofertas. Podes desligar quando quiseres.</Text>
            </View>
            <Toggle on={marketing} />
          </Pressable>

          {marketing &&
            CATEGORIES.map((p, i, arr) => (
              <Pressable
                key={p.key}
                style={[styles.prefRow, styles.prefRowSub, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => togglePref(p.key)}
                disabled={!client}
                accessibilityRole="switch"
                accessibilityState={{ checked: prefs[p.key] }}
              >
                <Text style={styles.prefLabel}>{p.label}</Text>
                <Toggle on={prefs[p.key]} />
              </Pressable>
            ))}
        </View>

        <Text style={styles.secTitle}>Conta</Text>
        <View style={styles.accountList}>
          <Pressable style={styles.accountRow} onPress={() => navigation.navigate('PersonalData')}>
            <Text style={styles.accountLabel}>Dados pessoais</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={styles.accountRow} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
            <Text style={styles.accountLabel}>Política de privacidade</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={styles.accountRow} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
            <Text style={styles.accountLabel}>Termos de utilização</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={styles.accountRow} onPress={() => signOut()}>
            <Text style={styles.accountLabel}>Terminar sessão</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={[styles.accountRow, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('DeleteAccount')}>
            <Text style={[styles.accountLabel, styles.accountDanger]}>Apagar a minha conta e dados</Text>
            <ChevronRightIcon color={colors.danger} />
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
  headerText: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  since: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  termsCard: {
    margin: 18,
    marginBottom: 0,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,161,91,0.12)',
  },
  termsTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginBottom: 4 },
  termsDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, lineHeight: 16, marginBottom: 13 },
  termsError: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginBottom: 8 },
  inlineLink: { fontFamily: fonts.bodyBold, color: colors.goldBright, textDecorationLine: 'underline' },
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
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  prefRowSub: { paddingLeft: 14, paddingVertical: 9 },
  prefText: { flex: 1 },
  prefLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.ink },
  prefHint: { fontFamily: fonts.body, fontSize: 10, color: colors.inkFaint, lineHeight: 14, marginTop: 2 },
  alwaysOn: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(183,209,168,0.35)', paddingHorizontal: 8, paddingVertical: 3 },
  alwaysOnText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 0.6, color: colors.ok, textTransform: 'uppercase' },
  toggle: { width: 34, height: 19, borderRadius: 10, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  toggleThumb: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.inkFaint, marginLeft: 2 },
  toggleThumbOn: { backgroundColor: '#0b0a08', marginLeft: 17 },
  accountList: { paddingHorizontal: 18, marginTop: 2, marginBottom: 24 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  accountLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
  accountDanger: { color: colors.danger },
});
