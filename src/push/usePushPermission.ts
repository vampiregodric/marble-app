import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getPushPermission, PushPermission } from './push';

// Estado da permissão de push deste telemóvel, reavaliado quando a app
// volta ao primeiro plano (o cliente pode ter ido às Definições do sistema).
// null enquanto se lê pela primeira vez; 'unsupported' no web, no Expo Go
// (Android) e em simuladores. O segundo valor força uma nova leitura —
// chama-se depois de enablePush. Usado pelo cartão do ecrã Alertas e pelo
// passo "Recebe os alertas no telemóvel" (Secção 15).
export function usePushPermission(): [PushPermission | null, () => void] {
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
