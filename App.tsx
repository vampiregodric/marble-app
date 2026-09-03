import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, AlexBrush_400Regular } from '@expo-google-fonts/alex-brush';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from '@expo-google-fonts/jost';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { colors } from './src/theme/theme';
import { WEB_MAX_WIDTH } from './src/utils/layout';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/auth/AuthContext';
// Inicializa o Firebase no arranque (lê .env). Falha cedo se a config faltar.
import './src/firebase/config';

export default function App() {
  const [fontsLoaded] = useFonts({
    AlexBrush_400Regular,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screen },
  webFrame: { flex: 1, backgroundColor: colors.screen, alignItems: 'center' },
  webColumn: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: WEB_MAX_WIDTH,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.hairline,
    }),
  },
});
