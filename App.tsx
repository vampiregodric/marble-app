import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Jost_500Medium } from '@expo-google-fonts/jost';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { colors } from './src/theme/theme';
import { WEB_FRAME_BORDER, WEB_MAX_WIDTH } from './src/utils/layout';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/auth/AuthContext';
// Inicializa o Firebase no arranque (lê .env). Falha cedo se a config faltar.
import './src/firebase/config';

// O ecrã de arranque nativo (app.json → expo-splash-screen) fica visível até
// as fontes estarem prontas, em vez de um ecrã intermédio com um indicador
// (DES-09 da auditoria de 2026-09-12). Chama-se fora do componente, como a
// documentação pede, para não chegar tarde. Na web não há splash — a função
// é um no-op e o que se vê é o fundo preto (ver abaixo).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  // Só as faces usadas nos estilos (src/theme/theme.ts). As três que aqui
  // estavam sem uso — AlexBrush, Jost 400 e Jost 600, 233 KB — saíram na
  // auditoria de 2026-09-12; se uma voltar a fazer falta, entra aqui e no
  // mapa `fonts` do tema.
  const [fontsLoaded, fontError] = useFonts({
    Jost_500Medium,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // Com erro a app arranca na mesma, com as fontes do sistema — fica
  // diferente, mas funciona. Antes ficava presa no indicador para sempre
  // (QUA-07).
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!ready) return;
    if (fontError) console.warn('Fontes da app não carregaram; a usar as do sistema.', fontError);
    SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, fontError]);

  if (!ready) {
    // No telemóvel o splash está por cima disto; na web é o fundo preto sem
    // indicador durante o carregamento das fontes (menos de um segundo).
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        {/* Na web, a app fica numa coluna com largura de telemóvel, centrada —
            é uma app de telemóvel e esticada a um monitor inteiro fica
            ilegível. Os ecrãs medem a largura com useAppWidth() (utils/layout). */}
        <View style={styles.webFrame}>
          <View style={styles.webColumn}>
            <RootNavigator />
          </View>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.screen },
  webFrame: { flex: 1, backgroundColor: colors.screen, alignItems: 'center' },
  webColumn: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: WEB_MAX_WIDTH,
      borderLeftWidth: WEB_FRAME_BORDER,
      borderRightWidth: WEB_FRAME_BORDER,
      borderColor: colors.hairline,
    }),
  },
});
