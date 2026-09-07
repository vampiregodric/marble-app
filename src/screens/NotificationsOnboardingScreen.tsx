import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import AuthGate from '../components/AuthGate';
import Toggle from '../components/Toggle';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { enablePush, openNotificationSettings, pushSupported } from '../push/push';
import { usePushPermission } from '../push/usePushPermission';
import { useT } from '../i18n';

// Passo "Recebe os alertas no telemóvel" (Secção 15): um ecrã, uma vez por
// conta, logo a seguir a criar conta — ou na primeira abertura com sessão
// sem push ativo. Quem decide quando abre é src/push/onboarding.ts.
//
// Pedido do Fábio: "quem cria conta devia ter tudo ativo". Na UE não pode
// ser automático — o consentimento de marketing é um gesto da pessoa, nada
// pré-marcado (Secção 3) — por isso pergunta-se no momento certo:
// - "Ativar notificações" pede a permissão do sistema (enablePush), o
//   mesmo que o cartão do ecrã Alertas; recusada → "Abrir definições". No
//   web e no Expo Go não há push e o cartão não aparece.
// - "Ofertas e novidades" é o interruptor do Perfil, desligado; um toque
//   grava consent.marketing. As categorias ficam como estão no Perfil.
// - "Agora não" volta aos tabs; o cartão do ecrã Alertas continua lá.
// Abrir o passo já conta como visto (clients/{uid}.onboardingSeenAt):
// fechar a app a meio não o faz voltar — uma vez chega.
export default function NotificationsOnboardingScreen() {
  return (
    <AuthGate>
      <OnboardingStep />
    </AuthGate>
  );
}

function OnboardingStep() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const T = useT();
  const { user, client, accountJustCreated, setMarketingConsent, markOnboardingSeen } = useAuth();
  const [permission, refreshPush] = usePushPermission();
  const [enabling, setEnabling] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  // Guarda o interruptor localmente enquanto o Firestore confirma.
  const [pendingMarketing, setPendingMarketing] = useState<boolean | null>(null);
  const [marketingError, setMarketingError] = useState<string | null>(null);
  const marketing = pendingMarketing ?? client?.consent?.marketing ?? false;

  // Uma escrita de cada vez; se falhar (rede, primeira escrita logo a
  // seguir ao login), o snapshot seguinte volta a tentar. Quando entra,
  // `client.onboardingSeenAt` passa a existir e o efeito deixa de escrever.
  const savingSeen = useRef(false);
  useEffect(() => {
    if (!client || client.onboardingSeenAt || savingSeen.current) return;
    savingSeen.current = true;
    markOnboardingSeen().catch(() => {
      savingSeen.current = false;
    });
  }, [client, markOnboardingSeen]);

  // No web e no Expo Go a permissão nem se lê: não há push.
  const push = pushSupported ? permission : 'unsupported';
  if (push === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const onEnablePush = async () => {
    if (!user) return;
    setEnabling(true);
    setPushError(null);
    try {
      await enablePush(user.uid);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : T.alerts.enableError);
    } finally {
      setEnabling(false);
      refreshPush();
    }
  };

  const toggleMarketing = async () => {
    const next = !marketing;
    setPendingMarketing(next);
    setMarketingError(null);
    try {
      await setMarketingConsent(next);
    } catch {
      setMarketingError(T.onboarding.marketingError);
    } finally {
      setPendingMarketing(null);
    }
  };

  // Volta ao tab de onde veio (Alertas/Perfil depois do registo, Início no
  // arranque); aberto por URL na web não há para onde voltar.
  const leave = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs', { screen: 'Home' });
  };

  const needsPushAction = push === 'undetermined' || push === 'denied';
  const primaryLabel = push === 'undetermined' ? T.alerts.enable : push === 'denied' ? T.alerts.openSettings : T.onboarding.continue;
  const onPrimary = push === 'undetermined' ? onEnablePush : push === 'denied' ? openNotificationSettings : leave;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.eyebrow}>{accountJustCreated ? T.onboarding.eyebrowNew : T.onboarding.eyebrow}</Text>
        <Text style={styles.title}>{T.onboarding.title}</Text>
        <Text style={styles.lead}>{T.onboarding.lead}</Text>

        {push !== 'unsupported' && (
          <View style={styles.pushCard}>
            <View style={styles.pushHead}>
              <Text style={styles.pushTitle}>{push === 'denied' ? T.alerts.pushDeniedTitle : T.onboarding.pushTitle}</Text>
              {push === 'granted' && (
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>{T.onboarding.pushActive}</Text>
                </View>
              )}
            </View>
            <Text style={styles.pushDesc}>{push === 'denied' ? T.alerts.pushDeniedDesc : T.onboarding.pushDesc}</Text>
            {pushError && <Text style={styles.error}>{pushError}</Text>}
          </View>
        )}

        {/* Marketing: opt-in explícito, desligado por defeito (RGPD). */}
        <Pressable
          style={styles.prefRow}
          onPress={toggleMarketing}
          disabled={!client}
          accessibilityRole="switch"
          accessibilityState={{ checked: marketing }}
        >
          <View style={styles.prefText}>
            <Text style={styles.prefLabel}>{T.profile.marketingLabel}</Text>
            <Text style={styles.prefHint}>{T.profile.marketingHint}</Text>
          </View>
          <Toggle on={marketing} />
        </Pressable>
        {marketingError && <Text style={styles.error}>{marketingError}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, enabling && styles.ctaBusy]}
          onPress={onPrimary}
          disabled={enabling}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
        >
          {enabling ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>{primaryLabel}</Text>}
        </Pressable>
        {needsPushAction && (
          <Pressable style={styles.linkBtn} onPress={leave} accessibilityRole="button">
            <Text style={styles.linkText}>{T.onboarding.notNow}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screen },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  logo: { height: 70, width: 124, alignSelf: 'center', marginBottom: 22 },
  eyebrow: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.6, color: colors.gold, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 26, color: colors.ink, marginTop: 4 },
  lead: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkMuted, lineHeight: 18, marginTop: 6, marginBottom: 22 },
  pushCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,161,91,0.12)',
  },
  pushHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  pushTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink },
  pushDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, lineHeight: 16 },
  statusChip: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(183,209,168,0.35)', paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 0.6, color: colors.ok, textTransform: 'uppercase' },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel,
    marginTop: 10,
  },
  prefText: { flex: 1 },
  prefLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.ink },
  prefHint: { fontFamily: fonts.body, fontSize: 10, color: colors.inkFaint, lineHeight: 14, marginTop: 2 },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginTop: 8 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 4 },
  cta: { backgroundColor: colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
  linkBtn: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  linkText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, textDecorationLine: 'underline' },
});
