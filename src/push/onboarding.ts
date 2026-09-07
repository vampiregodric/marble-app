import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { navigationRef } from '../navigation/navigationRef';
import { getPushPermission, pushSupported } from './push';

// Passo "Recebe os alertas no telemóvel" (Secção 15): QUANDO aparece. O
// ecrã em si é src/screens/NotificationsOnboardingScreen.tsx.
//
// Uma vez por conta (clients/{uid}.onboardingSeenAt), empilhado por cima
// dos tabs:
// - logo a seguir a criar conta — no registo ou num pedido de orçamento
//   sem conta (accountJustCreated) — em todas as plataformas; no web e no
//   Expo Go não há push e o passo mostra só "Ofertas e novidades";
// - senão, na primeira abertura com sessão em que o push deste telemóvel
//   não esteja ativo (permissão por pedir ou recusada). Apanha as contas
//   anteriores à Secção 15 e as sessões guardadas, uma única vez (decisão
//   do Fábio, 2026-09-07). No web nunca — não haveria nada para ativar.
// Só dispara com os tabs à vista: nunca por cima de um ecrã empilhado (a
// confirmação "Recebemos o teu pedido", o Detalhe aberto por um push).
// Espera pelo NavigationContainer (`ready`) e reavalia a cada mudança de
// navegação. Quem grava onboardingSeenAt é o próprio ecrã, ao abrir.
export function useNotificationsOnboardingTrigger(ready: boolean): void {
  const { user, client, accountJustCreated } = useAuth();
  // Nome do ecrã no topo do stack raiz ('Tabs', 'RequestQuote', …).
  const [rootRoute, setRootRoute] = useState<string | undefined>();
  // Não repete na mesma sessão da app, mesmo que a escrita de
  // onboardingSeenAt falhe (offline) ou demore a voltar no snapshot.
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    const update = () => {
      if (!navigationRef.isReady()) return;
      const state = navigationRef.getRootState();
      setRootRoute(state ? state.routes[state.index]?.name : undefined);
    };
    update();
    return navigationRef.addListener('state', update);
  }, [ready]);

  const uid = user?.uid;
  const eligible = !!client && !client.deletedAt && !client.onboardingSeenAt;

  useEffect(() => {
    if (!ready || !uid || !eligible || rootRoute !== 'Tabs' || shownFor.current === uid) return;
    let cancelled = false;
    const decide = async (): Promise<boolean> => {
      if (accountJustCreated) return true;
      if (!pushSupported) return false;
      const permission = await getPushPermission().catch(() => 'unsupported' as const);
      return permission === 'undetermined' || permission === 'denied';
    };
    decide().then((show) => {
      if (cancelled || !show || shownFor.current === uid) return;
      shownFor.current = uid;
      navigationRef.navigate('NotificationsOnboarding');
    });
    return () => {
      cancelled = true;
    };
  }, [ready, uid, eligible, accountJustCreated, rootRoute]);
}
