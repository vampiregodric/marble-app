import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FirebaseError } from 'firebase/app';
import { colors, fonts } from '../theme/theme';
import { BackIcon } from '../components/Icons';
import FormField from '../components/FormField';
import Checkbox from '../components/Checkbox';
import OptionChips from '../components/OptionChips';
import PhotoPicker, { PickedPhoto } from '../components/PhotoPicker';
import Photo from '../components/Photo';
import ActionSheet, { SheetAction } from '../components/ActionSheet';
import { useAuth } from '../auth/AuthContext';
import { authErrorMessage } from '../auth/errors';
import { validateEmail, validateName, validatePassword, validatePhone } from '../auth/validation';
import { DEPARTMENTS } from '../data/departments';
import { categoryFullName } from '../data/categories';
import { requestForm, RequestFormField } from '../data/requestForms';
import { createRequest, deviceLimitReached, newRequestId, recordDeviceSend } from '../data/requests';
import { useWork } from '../data/works';
import { canUseCamera, pickRequestPhotos, takeRequestPhoto } from '../media/requestPhotos';
import { requestUploadConfigured, uploadRequestPhoto } from '../media/cloudinary';
import { ContactPreference, DepartmentId, REQUEST_LIMITS, RequestField, RequestPhoto } from '../firebase/models';
import { RootStackParamList } from '../navigation/types';
import { useT } from '../i18n';

type Route = RouteProp<RootStackParamList, 'RequestQuote'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const CONTACT_KEYS: ContactPreference[] = ['call', 'whatsapp', 'email'];

type Errors = Partial<Record<string, string>>;

// Pedido de orçamento (Secção 7). Chega-se aqui pelo botão "Pedir orçamento
// semelhante" do Detalhe (com `workId`), pelas páginas de departamento
// (Secções 9/10, com `department`) ou por "Pedir orçamento" no Perfil (sem
// nada: o cliente escolhe o departamento). O formulário em si vem de
// src/data/requestForms.ts; este ecrã é genérico.
//
// Decisão do Fábio (2026-09-04): o pedido cria conta. Sem sessão, o
// formulário pede nome, email e telemóvel e a aceitação dos termos; ao
// enviar, a conta nasce com esses dados (password aleatória + email do
// Firebase para a definir), fica com sessão neste dispositivo e o pedido
// grava-se já ligado ao cliente. Email com conta → pede só a password.
//
// Idiomas (Secção 12): as opções aparecem no idioma da app, mas o que se
// guarda (`services`, `fields[].label`) é sempre o texto em português —
// os chips guardam `value` (PT) e mostram `label`.
export default function RequestQuoteScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const params = route.params ?? {};
  const T = useT();
  const { user, client, signIn, createAccountFromRequest } = useAuth();
  const { data: work, loading: workLoading } = useWork(params.workId);

  // Departamento: do parâmetro, do trabalho (pela categoria), ou escolhido aqui.
  const workDepartment = useMemo(() => (work ? DEPARTMENTS.find((d) => d.category === work.category)?.id : undefined), [work]);
  const [chosenDepartment, setChosenDepartment] = useState<DepartmentId | undefined>(params.department);
  const department = params.department ?? workDepartment ?? chosenDepartment;
  const form = useMemo(() => (department ? requestForm(department) : null), [department]);
  const departmentMeta = department ? DEPARTMENTS.find((d) => d.id === department) : undefined;
  const departmentLocked = !!params.department || !!params.workId;

  const [services, setServices] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [contact, setContact] = useState<ContactPreference>('call');

  // Dados de contacto: pré-preenchidos com a conta quando há sessão.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // 'login' quando o email já tem conta: pede a password para entrar e enviar.
  const [mode, setMode] = useState<'form' | 'login'>('form');

  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<{ accountCreated: boolean; email: string; contact: ContactPreference; phone: string } | null>(null);

  useEffect(() => {
    if (user?.email) setEmail((e) => e || user.email || '');
    if (user?.displayName) setName((n) => n || user.displayName || '');
    if (client) {
      setName((n) => n || client.name);
      setPhone((p) => p || client.phone || '');
    }
  }, [user, client]);

  // Mudar de departamento limpa o que era específico do anterior.
  const pickDepartment = (id: DepartmentId) => {
    setChosenDepartment(id);
    setServices([]);
    setFieldValues({});
    setErrors({});
  };

  const toggleService = (o: string) => setServices((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]));
  const setField = (key: string, value: string) => setFieldValues((v) => ({ ...v, [key]: value }));

  const addPhotos = (source: 'library' | 'camera') => {
    setPhotoMenu(false);
    const room = REQUEST_LIMITS.photosMax - photos.length;
    if (room <= 0) return;
    const run = async () => {
      const uris = source === 'camera' ? [await takeRequestPhoto()].filter((u): u is string => !!u) : await pickRequestPhotos(room);
      if (uris.length) setPhotos((p) => [...p, ...uris.slice(0, room).map((uri) => ({ uri }))]);
    };
    // No browser o seletor só abre dentro do toque — nada de esperar antes.
    run().catch((err) => setFeedback(err instanceof Error ? err.message : T.photoPicker.pickFailed));
  };

  const onAddPhoto = () => {
    if (canUseCamera) setPhotoMenu(true);
    else addPhotos('library');
  };

  const photoActions: SheetAction[] = [
    { label: T.photoPicker.fromLibrary, onPress: () => addPhotos('library') },
    { label: T.photoPicker.takePhoto, onPress: () => addPhotos('camera') },
  ];

  const needsName = !user || !name.trim();
  const needsPhone = !user || !phone.trim();
  const showContactBlock = !user || needsName || needsPhone;

  const validate = (): boolean => {
    const next: Errors = {};
    if (!department) next.department = T.request.chooseDepartment;
    if (form) {
      for (const f of form.fields) {
        const v = (fieldValues[f.key] ?? '').trim();
        if (f.required && !v) next[f.key] = f.options ? T.request.chooseOption : T.request.fillField;
        if (v.length > REQUEST_LIMITS.fieldMax) next[f.key] = T.request.maxChars(REQUEST_LIMITS.fieldMax);
      }
    }
    if (message.trim().length < 5) next.message = T.request.messageShort;
    if (message.length > REQUEST_LIMITS.messageMax) next.message = T.request.maxChars(REQUEST_LIMITS.messageMax);
    if (!user) {
      next.name = validateName(name);
      next.email = validateEmail(email);
      next.phone = validatePhone(phone);
      if (mode === 'login') next.password = validatePassword(password);
      else if (!acceptedTerms) next.terms = T.request.termsRequired;
    } else {
      if (needsName) next.name = validateName(name);
      if (needsPhone) next.phone = validatePhone(phone);
    }
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const submit = async () => {
    setFeedback(null);
    if (!validate() || !department || !form) return;
    if (await deviceLimitReached()) {
      setFeedback(T.request.dailyLimit(REQUEST_LIMITS.perDayMax));
      return;
    }

    try {
      // 1. Sessão: entrar, ou criar a conta com os dados do formulário.
      let uid = user?.uid ?? null;
      let accountCreated = false;
      if (!uid) {
        if (mode === 'login') {
          setBusy(T.request.busyLogin);
          uid = await signIn(email, password);
        } else {
          setBusy(T.request.busyCreating);
          try {
            uid = await createAccountFromRequest({ name, email, phone, acceptedTerms });
            accountCreated = true;
          } catch (err) {
            if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
              setMode('login');
              setFeedback(T.request.emailExists);
              return;
            }
            throw err;
          }
        }
      }

      // 2. Fotos (opcionais), com a tag do pedido.
      const id = newRequestId();
      const uploaded: RequestPhoto[] = [];
      for (let i = 0; i < photos.length; i++) {
        setBusy(T.request.busyPhoto(i + 1, photos.length));
        const photo = await uploadRequestPhoto(photos[i].uri, id, (fraction) =>
          setPhotos((p) => p.map((x, j) => (j === i ? { ...x, progress: fraction } : x)))
        );
        uploaded.push(photo);
      }

      // 3. O pedido. As etiquetas guardadas são as em português
      // (`storedLabel`), seja qual for o idioma da app.
      setBusy(T.request.busySending);
      const fields: RequestField[] = form.fields
        .map((f) => ({ key: f.key, label: f.storedLabel, value: (fieldValues[f.key] ?? '').trim() }))
        .filter((f) => f.value);
      await createRequest(id, uid, {
        department,
        name,
        email,
        phone,
        contactPreference: contact,
        services,
        fields,
        message,
        photos: uploaded,
        workId: work?.id,
        workTitle: work?.title,
      });
      await recordDeviceSend();
      setDone({ accountCreated, email: email.trim(), contact, phone: phone.trim() });
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setFeedback(code.startsWith('auth/') ? authErrorMessage(err) : err instanceof Error && !code ? err.message : T.request.sendFailed(code));
    } finally {
      setBusy(null);
    }
  };

  const renderField = (f: RequestFormField) => {
    const value = fieldValues[f.key] ?? '';
    if (f.options) {
      return (
        <View key={f.key} style={styles.block}>
          <Text style={styles.label}>{f.label}</Text>
          <OptionChips
            options={f.options.map((o) => ({ key: o.value, label: o.label }))}
            selected={value ? [value] : []}
            onToggle={(o) => setField(f.key, value === o ? '' : o)}
          />
          {errors[f.key] ? <Text style={styles.error}>{errors[f.key]}</Text> : null}
        </View>
      );
    }
    return (
      <FormField
        key={f.key}
        label={f.label}
        value={value}
        onChangeText={(t) => setField(f.key, t)}
        placeholder={f.placeholder}
        error={errors[f.key]}
        keyboardType={f.keyboardType === 'numeric' ? 'numeric' : f.keyboardType === 'url' ? 'url' : 'default'}
        autoCapitalize={f.keyboardType === 'url' ? 'none' : 'sentences'}
        maxLength={REQUEST_LIMITS.fieldMax}
      />
    );
  };

  // "por WhatsApp (912…)" / "por chamada (912…)" / "por email (x@y)".
  const doneContactLabel = done ? (done.contact === 'whatsapp' ? 'WhatsApp' : T.contactPreference[done.contact].toLowerCase()) : '';
  const doneContactDetail = done ? (done.contact === 'email' ? done.email : done.phone) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel={T.common.back}>
          <BackIcon />
        </Pressable>
        <Text style={styles.topTitle}>{T.request.title}</Text>
        <View style={styles.backBtn} />
      </View>

      {done ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.doneCard}>
            <Text style={styles.doneEyebrow}>{T.request.doneEyebrow}</Text>
            <Text style={styles.doneTitle}>{T.request.doneTitle}</Text>
            <Text style={styles.doneText}>{T.request.doneText(T.request.responsePromise, doneContactLabel, doneContactDetail)}</Text>
            <Text style={styles.doneText}>{done.accountCreated ? T.request.doneAccountCreated(done.email) : T.request.doneFollow}</Text>
            <Pressable style={styles.cta} onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })} accessibilityRole="button">
              <Text style={styles.ctaText}>{T.request.seeMyRequests}</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} accessibilityRole="button">
              <Text style={styles.ghostText}>{T.request.backHome}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Contexto: o trabalho (foto real de capa), o departamento, ou a escolha. */}
            {params.workId ? (
              <View style={styles.contextCard}>
                <View style={styles.contextThumb}>{work ? <Photo url={work.photoUrl} seed={work.id} /> : null}</View>
                <View style={styles.flex}>
                  <Text style={styles.contextEyebrow}>{T.request.similarTo}</Text>
                  {workLoading ? (
                    <ActivityIndicator color={colors.gold} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                  ) : (
                    <>
                      <Text style={styles.contextTitle} numberOfLines={2}>
                        {work?.title ?? T.request.workUnavailable}
                      </Text>
                      {work ? <Text style={styles.contextSub}>{categoryFullName(work.category)}</Text> : null}
                    </>
                  )}
                </View>
              </View>
            ) : departmentLocked && departmentMeta ? (
              <View style={styles.contextCard}>
                <View style={styles.flex}>
                  <Text style={styles.contextEyebrow}>{T.request.department}</Text>
                  <Text style={styles.contextTitle}>{departmentMeta.name}</Text>
                  <Text style={styles.contextSub}>{departmentMeta.tagline}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.block}>
                <Text style={styles.label}>{T.request.department}</Text>
                <OptionChips
                  options={DEPARTMENTS.map((d) => ({ key: d.id, label: d.name }))}
                  selected={department ? [department] : []}
                  onToggle={(id) => pickDepartment(id as DepartmentId)}
                />
                {errors.department ? <Text style={styles.error}>{errors.department}</Text> : null}
              </View>
            )}

            {form ? (
              <>
                <Text style={styles.lead}>{form.lead}</Text>

                <View style={styles.block}>
                  <Text style={styles.label}>{form.servicesLabel}</Text>
                  <OptionChips options={form.services.map((s) => ({ key: s.value, label: s.label }))} selected={services} onToggle={toggleService} />
                </View>

                {form.fields.map(renderField)}

                <FormField
                  label={T.request.message}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={form.messagePlaceholder}
                  error={errors.message}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={styles.multiline}
                  maxLength={REQUEST_LIMITS.messageMax}
                />

                {form.photos && requestUploadConfigured ? (
                  <View style={styles.block}>
                    <Text style={styles.label}>{form.photos.label}</Text>
                    <PhotoPicker photos={photos} max={REQUEST_LIMITS.photosMax} onAdd={onAddPhoto} onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))} disabled={!!busy} />
                    <Text style={styles.hint}>{form.photos.hint}</Text>
                  </View>
                ) : null}

                <View style={styles.block}>
                  <Text style={styles.label}>{T.request.contactHow}</Text>
                  <OptionChips
                    options={CONTACT_KEYS.map((k) => ({ key: k, label: T.contactPreference[k] }))}
                    selected={[contact]}
                    onToggle={(k) => setContact(k as ContactPreference)}
                  />
                </View>

                {showContactBlock ? (
                  <>
                    <Text style={styles.secTitle}>{user ? T.request.missing : T.request.yourData}</Text>
                    {!user ? <Text style={styles.secDesc}>{mode === 'login' ? T.request.loginLead : T.request.createLead}</Text> : null}
                    {needsName ? (
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
                    ) : null}
                    {!user ? (
                      <FormField
                        label={T.login.email}
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          if (mode === 'login') setMode('form');
                        }}
                        error={errors.email}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        autoComplete="email"
                        textContentType="emailAddress"
                        placeholder={T.login.emailPlaceholder}
                      />
                    ) : null}
                    {needsPhone ? (
                      <FormField
                        label={T.login.phone}
                        value={phone}
                        onChangeText={setPhone}
                        error={errors.phone}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        textContentType="telephoneNumber"
                        placeholder={T.login.phonePlaceholder}
                        hint={T.request.phoneHint}
                      />
                    ) : null}
                    {!user && mode === 'login' ? (
                      <FormField
                        label={T.login.password}
                        value={password}
                        onChangeText={setPassword}
                        error={errors.password}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete="current-password"
                        textContentType="password"
                        placeholder={T.request.passwordPlaceholder}
                        hint={T.request.passwordHint}
                      />
                    ) : null}
                    {!user && mode === 'form' ? (
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
                        {T.request.acceptSuffix}
                      </Checkbox>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.contactLine}>
                    {T.request.contactLine(phone, email)}
                    <Text style={styles.inlineLink} onPress={() => navigation.navigate('PersonalData')}>
                      {T.request.edit}
                    </Text>
                  </Text>
                )}

                {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

                <Pressable style={[styles.cta, busy && styles.ctaBusy]} onPress={submit} disabled={!!busy} accessibilityRole="button">
                  {busy ? (
                    <View style={styles.busyRow}>
                      <ActivityIndicator color="#0b0a08" />
                      <Text style={styles.ctaText}>{busy}</Text>
                    </View>
                  ) : (
                    <Text style={styles.ctaText}>{mode === 'login' ? T.request.loginAndSend : T.request.send}</Text>
                  )}
                </Pressable>
                <Text style={styles.legalNote}>{T.request.legalNote}</Text>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <ActionSheet visible={photoMenu} title={T.photoPicker.addTitle} actions={photoActions} onClose={() => setPhotoMenu(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 1.4, color: colors.ink, textTransform: 'uppercase' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  contextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 12, backgroundColor: colors.panel, marginBottom: 16 },
  contextThumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline },
  contextEyebrow: { fontFamily: fonts.eyebrow, fontSize: 8.5, letterSpacing: 1.2, color: colors.goldBright, textTransform: 'uppercase' },
  contextTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginTop: 2 },
  contextSub: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  lead: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.inkMuted, marginBottom: 16 },
  block: { marginBottom: 16 },
  label: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.4, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: 8 },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginTop: 8 },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginTop: 6 },
  multiline: { minHeight: 110, paddingTop: 12 },
  secTitle: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 1.6, color: colors.inkMuted, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  secDesc: { fontFamily: fonts.body, fontSize: 11.5, color: colors.inkFaint, lineHeight: 16, marginBottom: 12 },
  contactLine: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 17, color: colors.inkMuted, marginBottom: 14 },
  inlineLink: { fontFamily: fonts.bodyBold, color: colors.goldBright, textDecorationLine: 'underline' },
  feedback: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.danger, marginBottom: 12 },
  cta: { backgroundColor: colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaBusy: { opacity: 0.7 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
  legalNote: { fontFamily: fonts.body, fontSize: 10, lineHeight: 14, color: colors.inkFaint, textAlign: 'center', marginTop: 12 },
  ghost: { borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 24, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ghostText: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  doneCard: { borderWidth: 1, borderColor: colors.gold, backgroundColor: 'rgba(198,161,91,0.10)', borderRadius: 16, padding: 18, marginTop: 8 },
  doneEyebrow: { fontFamily: fonts.eyebrow, fontSize: 9, letterSpacing: 1.4, color: colors.goldBright, textTransform: 'uppercase', marginBottom: 6 },
  doneTitle: { fontFamily: fonts.bodyExtraBold, fontSize: 18, color: colors.ink, marginBottom: 10 },
  doneText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.inkMuted, marginBottom: 12 },
});
