import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import { BackIcon } from '../components/Icons';
import FormField from '../components/FormField';
import { useAuth } from '../auth/AuthContext';
import { authErrorMessage } from '../auth/errors';
import { RootStackParamList } from '../navigation/types';

const CONSEQUENCES = [
  'Deixas de conseguir entrar. Não há como recuperar a conta depois.',
  'O teu nome, email e telemóvel são removidos do nosso registo de imediato.',
  'O histórico de trabalhos nos teus carros e chãos fica guardado sem ligação a ti, para efeitos de garantia e portfólio.',
  'Deixas de receber notificações e a equipa deixa de ter o teu contacto.',
];

// "Apagar a minha conta e dados" (RGPD, Secção 3). Pede a password outra
// vez porque o Firebase exige login recente para apagar o utilizador — e
// porque é uma ação irreversível. O que acontece por baixo está explicado em
// AuthContext.deleteAccount.
export default function DeleteAccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const confirm = async () => {
    if (!password) {
      setError('Escreve a tua password para confirmar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.doneWrap}>
          <Text style={styles.eyebrow}>Conta apagada</Text>
          <Text style={styles.title}>Até à próxima</Text>
          <Text style={styles.lead}>
            Os teus dados pessoais foram removidos. Obrigado por teres sido cliente da Marble Studios — as portas ficam abertas.
          </Text>
          <Pressable style={styles.cta} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Home' } }] })}>
            <Text style={styles.ctaText}>Voltar ao início</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
          <BackIcon />
        </Pressable>
        <Text style={styles.topTitle}>Apagar conta</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>Isto é definitivo</Text>
          <Text style={styles.title}>Apagar a minha conta e dados</Text>
          <Text style={styles.lead}>Antes de confirmares, o que vai acontecer:</Text>

          <View style={styles.list}>
            {CONSEQUENCES.map((c) => (
              <View key={c} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{c}</Text>
              </View>
            ))}
          </View>

          <FormField
            label="Confirma com a tua password"
            value={password}
            onChangeText={setPassword}
            error={error ?? undefined}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder="A tua password"
            onSubmitEditing={confirm}
            returnKeyType="done"
          />

          <Pressable style={[styles.danger, busy && styles.dangerBusy]} onPress={confirm} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.dangerText}>Apagar definitivamente</Text>}
          </Pressable>
          <Pressable style={styles.cancel} onPress={() => navigation.goBack()} disabled={busy}>
            <Text style={styles.cancelText}>Afinal não, manter a conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 1.4, color: colors.ink, textTransform: 'uppercase' },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 32 },
  doneWrap: { flex: 1, paddingHorizontal: 22, justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.6, color: colors.danger, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 22, color: colors.ink, marginTop: 4 },
  lead: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.inkMuted, marginTop: 8 },
  list: { marginTop: 12, marginBottom: 22, gap: 8 },
  bulletRow: { flexDirection: 'row', gap: 10, paddingRight: 6 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 7 },
  bulletText: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.inkMuted },
  danger: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dangerBusy: { opacity: 0.6 },
  dangerText: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 0.8, color: colors.danger, textTransform: 'uppercase' },
  cancel: { alignSelf: 'center', paddingVertical: 16 },
  cancelText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, textDecorationLine: 'underline' },
  cta: { backgroundColor: colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
});
