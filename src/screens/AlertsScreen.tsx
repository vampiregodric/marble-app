import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import { EmptyState, ErrorState, LoadingState } from '../components/ListState';
import { useAuth } from '../auth/AuthContext';
import { markNotificationRead, useNotifications } from '../data/notifications';
import { AppNotification } from '../firebase/models';
import { RootStackParamList } from '../navigation/types';
import { enablePush, getPushPermission, openNotificationSettings, PushPermission } from '../push/push';
import { timeAgo } from '../utils/dates';
import { useT } from '../i18n';

// Estado da permissão de push deste telemóvel, reavaliado quando a app
// volta ao primeiro plano (o cliente pode ter ido às Definições do sistema).
// 'unsupported' no web, no Expo Go (Android) e em simuladores.
function usePushPermission(): [PushPermission | null, () => void] {
  const [state, setState] = useState<PushPermission | null>(null);
  const refresh = useCallback(() => {
    getPushPermission()
      .then(setState)
      .catch(() => setState('unsupported'));
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  return [state, refresh];
}

// Alertas do cliente (lembretes de checkup, novos trabalhos, ofertas,
// eventos), em tempo real. Tocar num alerta marca-o como lido e abre o que
// lhe diz respeito: o trabalho, a tab Eventos ou o Perfil (carro/chão).
// Este ecrã está dentro de AuthGate — há sempre sessão aqui.
//
// É também AQUI que se pede a permissão de notificações (Secção 6) — nunca
// no arranque: um cartão explica para que servem e o pedido do sistema só
// aparece quando o cliente toca em "Ativar notificações". O cartão
// desaparece quando está ativo, e não existe no web nem no Expo Go.
export default function AlertsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: alerts, loading, error } = useNotifications(user?.uid);
  const unreadCount = alerts.filter((a) => !a.read).length;
  const T = useT();

  const [push, refreshPush] = usePushPermission();
  const [enabling, setEnabling] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const showPushCard = push === 'undetermined' || push === 'denied';

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

  const open = (a: AppNotification) => {
    if (!a.read) {
      // Não bloqueia a navegação; se falhar (offline), o ponto volta a aparecer
      // no próximo snapshot e o cliente pode tocar outra vez.
      markNotificationRead(a.id).catch(() => {});
    }
    if (a.relatedWorkId) navigation.navigate('WorkDetail', { workId: a.relatedWorkId });
    else if (a.relatedEventId) navigation.navigate('Tabs', { screen: 'Events' });
    else if (a.relatedVehicleId || a.relatedRequestId) navigation.navigate('Tabs', { screen: 'Profile' });
  };

  const subtitle = loading ? T.common.loading : unreadCount === 0 ? T.alerts.allRead : T.alerts.unread(unreadCount);
  const pushCta = push === 'denied' ? T.alerts.openSettings : T.alerts.enable;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{T.alerts.title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {showPushCard && (
        <View style={styles.pushCard}>
          <Text style={styles.pushTitle}>{push === 'denied' ? T.alerts.pushDeniedTitle : T.alerts.pushTitle}</Text>
          <Text style={styles.pushDesc}>{push === 'denied' ? T.alerts.pushDeniedDesc : T.alerts.pushDesc}</Text>
          {pushError && <Text style={styles.pushError}>{pushError}</Text>}
          <Pressable
            style={[styles.cta, enabling && { opacity: 0.6 }]}
            onPress={push === 'denied' ? openNotificationSettings : onEnablePush}
            disabled={enabling}
            accessibilityRole="button"
            accessibilityLabel={pushCta}
          >
            {enabling ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>{pushCta}</Text>}
          </Pressable>
        </View>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : alerts.length === 0 ? (
        <EmptyState title={T.alerts.emptyTitle} description={T.alerts.emptyDesc} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {alerts.map((a) => (
            <Pressable
              key={a.id}
              style={styles.row}
              onPress={() => open(a)}
              accessibilityRole="button"
              accessibilityLabel={`${a.title}${a.read ? '' : T.alerts.unreadA11y}`}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{a.title}</Text>
                <View style={styles.rowContent}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowDesc}>{a.description}</Text>
                    <Text style={styles.rowTime}>{timeAgo(a.createdAt)}</Text>
                  </View>
                  <View style={styles.thumb}>
                    <Photo url={a.photoUrl} seed={a.type} />
                  </View>
                </View>
              </View>
              {!a.read && <View style={styles.unreadDot} />}
            </Pressable>
          ))}
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
  pushCard: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,161,91,0.12)',
  },
  pushTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginBottom: 4 },
  pushDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, lineHeight: 16, marginBottom: 13 },
  pushError: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginBottom: 8 },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: '#0b0a08', textTransform: 'uppercase' },
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
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink, marginBottom: 7, paddingRight: 16 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1 },
  rowDesc: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkMuted, lineHeight: 15 },
  rowTime: { fontFamily: fonts.body, fontSize: 8.5, color: colors.inkFaint, marginTop: 6 },
  thumb: { width: 44, height: 44, borderRadius: 9, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden', backgroundColor: colors.panel2 },
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
