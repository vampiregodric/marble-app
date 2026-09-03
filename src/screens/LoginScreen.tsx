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
import { colors, fonts } from '../theme/theme';
import FormField from '../components/FormField';
import { useAuth } from '../auth/AuthContext';
import { authErrorMessage } from '../auth/errors';
import { validateEmail, validateName, validatePassword, validatePhone } from '../auth/validation';

type Mode = 'login' | 'register' | 'reset';

const COPY: Record<Mode, { eyebrow: string; title: string; lead: string; cta: string }> = {
  login: {
    eyebrow: 'A tua conta',
    title: 'Entrar',
    lead: 'Vê os teus carros e chãos, confirma checkups e recebe os alertas da Marble Studios.',
    cta: 'Entrar',
  },
  register: {
    eyebrow: 'Bem-vindo',
    title: 'Criar conta',
    lead: 'Fica com o histórico dos teus trabalhos e lembretes de manutenção num só sítio.',
    cta: 'Criar conta',
  },
  reset: {
    eyebrow: 'Recuperar acesso',
    title: 'Nova password',
    lead: 'Enviamos-te um email com um link para definires uma password nova.',
    cta: 'Enviar email',
  },
};

// Ecrã de login / registo / recuperação de password. Aparece no lugar dos tabs
// Perfil e Alertas quando não há sessão (ver components/AuthGate.tsx).
// Só email/password por agora — Google/Apple ficam para depois da conta de
// developer (Secção 11). A aceitação explícita de termos entra na Secção 3.
export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'phone' | 'password', string>>>({});
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = COPY[mode];

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
    }
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'register') {
        await signUp({ name, email, phone, password });
      } else {
        await resetPassword(email);
        setMessage({ kind: 'ok', text: 'Se existir conta com esse email, vais receber o link nos próximos minutos.' });
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
                label="Nome"
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                placeholder="O teu nome"
              />
            )}
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="nome@exemplo.pt"
            />
            {mode === 'register' && (
              <FormField
                label="Telemóvel"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                hint="Para a equipa te ligar sobre checkups e marcações."
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                placeholder="912 345 678"
              />
            )}
            {mode !== 'reset' && (
              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'A tua password'}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
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
                <Text style={styles.link}>Esqueceste-te da password?</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.footer}>
            {mode === 'login' ? (
              <Pressable onPress={() => switchMode('register')}>
                <Text style={styles.footerText}>
                  Ainda não tens conta? <Text style={styles.footerLink}>Criar conta</Text>
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => switchMode('login')}>
                <Text style={styles.footerText}>
                  Já tens conta? <Text style={styles.footerLink}>Entrar</Text>
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
  linkRow: { alignSelf: 'center', paddingVertical: 14 },
  link: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, textDecorationLine: 'underline' },
  footer: { marginTop: 18, alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.hairline },
  footerText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkMuted },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.goldBright },
});
