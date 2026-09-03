import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import { BackIcon } from '../components/Icons';
import FormField from '../components/FormField';
import { useAuth } from '../auth/AuthContext';
import { authErrorMessage } from '../auth/errors';
import { validateName, validatePhone } from '../auth/validation';

// "Dados pessoais" a partir do Perfil: editar nome e telemóvel, ver o email,
// pedir email de alteração de password. Apagar conta está no Perfil, em
// "Conta" (DeleteAccountScreen, Secção 3).
export default function PersonalDataScreen() {
  const navigation = useNavigation();
  const { user, client, updateClient, resetPassword } = useAuth();
  const [name, setName] = useState(client?.name ?? user?.displayName ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Se o doc do cliente chegar depois de abrir o ecrã, preenche os campos.
  useEffect(() => {
    if (client) {
      setName((n) => n || client.name);
      setPhone((p) => p || client.phone || '');
    }
  }, [client]);

  const dirty = name.trim() !== (client?.name ?? '') || phone.trim() !== (client?.phone ?? '');

  const save = async () => {
    const next = { name: validateName(name), phone: validatePhone(phone) };
    setErrors(next);
    if (next.name || next.phone) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateClient({ name: name.trim(), phone: phone.trim() });
      setMessage({ kind: 'ok', text: 'Dados guardados.' });
    } catch (err) {
      setMessage({ kind: 'error', text: authErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    setMessage(null);
    try {
      await resetPassword(user.email);
      setMessage({ kind: 'ok', text: `Enviámos um link para ${user.email} para definires uma password nova.` });
    } catch (err) {
      setMessage({ kind: 'error', text: authErrorMessage(err) });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <BackIcon />
        </Pressable>
        <Text style={styles.topTitle}>Dados pessoais</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormField label="Nome" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" autoComplete="name" />
          <FormField
            label="Telemóvel"
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            hint="Para a equipa te ligar sobre checkups e marcações."
          />
          <FormField
            label="Email"
            value={user?.email ?? ''}
            editable={false}
            hint="Para mudar o email de acesso, fala com a Marble Studios."
          />

          {message && (
            <Text style={[styles.message, message.kind === 'error' ? styles.messageError : styles.messageOk]}>{message.text}</Text>
          )}

          <Pressable style={[styles.cta, (!dirty || saving) && styles.ctaDisabled]} onPress={save} disabled={!dirty || saving}>
            {saving ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>Guardar</Text>}
          </Pressable>

          <Text style={styles.secTitle}>Password</Text>
          <Text style={styles.secDesc}>Por segurança a password muda-se por email: recebes um link para definir uma nova.</Text>
          <Pressable style={[styles.ghost, sendingReset && styles.ctaDisabled]} onPress={sendReset} disabled={sendingReset}>
            {sendingReset ? <ActivityIndicator color={colors.gold} /> : <Text style={styles.ghostText}>Enviar link para alterar password</Text>}
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
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  message: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  messageError: { color: colors.danger },
  messageOk: { color: colors.ok },
  cta: { backgroundColor: colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
  secTitle: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 1.6, color: colors.inkMuted, textTransform: 'uppercase', marginTop: 30, marginBottom: 6 },
  secDesc: { fontFamily: fonts.body, fontSize: 11.5, color: colors.inkFaint, lineHeight: 16, marginBottom: 12 },
  ghost: { borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 24, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
});
