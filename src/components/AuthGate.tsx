import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/theme';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';

// Envolve os tabs que precisam de conta (Perfil, Alertas). Sem sessão mostra
// o ecrã de login no lugar do tab; Início/Portfólio/Eventos ficam abertos.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { initializing, user } = useAuth();
  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (!user) return <LoginScreen />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screen },
});
