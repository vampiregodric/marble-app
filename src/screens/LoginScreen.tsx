import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import FormField from '../components/FormField';
import Checkbox from '../components/Checkbox';
import { useAuth } from '../auth/AuthContext';
import { authErrorMessage } from '../auth/errors';
import { validateEmail, validateName, validatePassword, validatePhone } from '../auth/validation';
import { RootStackParamList } from '../navigation/types';
import { useT } from '../i18n';

type Mode = 'login' | 'register' | 'reset';

// Ecrã de login / registo / recuperação de password. Aparece no lugar dos tabs
// Perfil e Alertas quando não há sessão (ver components/AuthGate.tsx).
// Só email/password por agora — Google/Apple ficam para depois da conta de
// developer (Secção 11). O registo exige aceitar os termos numa checkbox
// que nunca vem pré-marcada (RGPD). O consentimento de marketing NÃO se pede
// aqui — decisão do Fábio (Secção 3): liga-se no passo "Recebe os alertas
// no telemóvel", que aparece logo a seguir ao registo (Secção 15), ou no
// Perfil. Quem abre esse passo é src/push/onboarding.ts, não este ecrã.
export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, signUp, resetPassword } = useAuth();
  const T = useT();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'phone' | 'password' | 'terms', string>>>({});
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = T.login[mode];

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setMessage(null);
  };

  const submit = async () => {
    const next: typeof errors = {};
    next.email = validateEmail(email);
    if (mode !== 'reset') next.password = validatePassword(password);
    if (mode === 'register') {
      next.name = validateName(name);
      next.phone = validatePhone(phone);
      if (!acceptedTerms) next.terms = T.login.termsRequired;
    }
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'register') {
        await signUp({ name, email, phone, password, acceptedTerms });
      } else {
        await resetPassword(email);
        setMessage({ kind: 'ok', text: T.login.resetSent });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

          <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.lead}>{copy.lead}</Text>

          <View style={styles.form}>
            {mode === 'register' && (
              <FormField
                label={T.login.name}
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                placeholder={T.login.namePlaceholder}
              />
            )}
            <FormField
              label={T.login.email}
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder={T.login.emailPlaceholder}
            />
            {mode === 'register' && (
              <FormField
                label={T.login.phone}
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                hint={T.login.phoneHint}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                placeholder={T.login.phonePlaceholder}
              />
            )}
            {mode !== 'reset' && (
              <FormField
                label={T.login.password}
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                placeholder={mode === 'register' ? T.login.passwordPlaceholderNew : T.login.passwordPlaceholder}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
            )}

            {mode === 'register' && (
              <Checkbox
                checked={acceptedTerms}
                onChange={(v) => {
                  setAcceptedTerms(v);
                  if (v) setErrors((e) => ({ ...e, terms: undefined }));
                }}
                error={errors.terms}
              >
                {T.login.acceptPrefix}
                <Text style={styles.inlineLink} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
                  {T.login.termsLink}
                </Text>
                {T.login.acceptMiddle}
                <Text style={styles.inlineLink} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
                  {T.login.privacyLink}
                </Text>
                {T.login.acceptSuffix}
              </Checkbox>
            )}

            {message && (
              <Text style={[styles.message, message.kind === 'error' ? styles.messageError : styles.messageOk]}>
                {message.text}
              </Text>
            )}

            <Pressable style={[styles.cta, busy && styles.ctaBusy]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>{copy.cta}</Text>}
            </Pressable>

            {mode === 'login' && (
              <Pressable onPress={() => switchMode('reset')} style={styles.linkRow}>
                <Text style={styles.link}>{T.login.forgot}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.footer}>
            {mode === 'login' ? (
              <Pressable onPress={() => switchMode('register')}>
                <Text style={styles.footerText}>
                  {T.login.noAccount}
                  <Text style={styles.footerLink}>{T.login.createAccount}</Text>
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => switchMode('login')}>
                <Text style={styles.footerText}>
                  {T.login.haveAccount}
                  <Text style={styles.footerLink}>{T.login.enter}</Text>
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  logo: { height: 70, width: 124, alignSelf: 'center', marginBottom: 22 },
  eyebrow: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.6, color: colors.gold, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 26, color: colors.ink, marginTop: 4 },
  lead: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkMuted, lineHeight: 18, marginTop: 6, marginBottom: 22 },
  form: {},
  message: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  messageError: { color: colors.danger },
  messageOk: { color: colors.ok },
  cta: {
    backgroundColor: colors.gold,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
  inlineLink: { fontFamily: fonts.bodyBold, color: colors.goldBright, textDecorationLine: 'underline' },
  linkRow: { alignSelf: 'center', paddingVertical: 14 },
  link: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, textDecorationLine: 'underline' },
  footer: { marginTop: 18, alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.hairline },
  footerText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkMuted },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.goldBright },
});
