import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import Avatar from '../components/Avatar';
import ActionSheet, { SheetAction } from '../components/ActionSheet';
import CheckupSheet from '../components/CheckupSheet';
import Toggle from '../components/Toggle';
import { CameraIcon, ChevronRightIcon } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { authErrorMessage } from '../auth/errors';
import { cancelCheckupRequest, confirmCheckupProposal, pendingCheckup, useVehicles } from '../data/vehicles';
import { checkupErrorMessage, checkupState, formatCheckupSlot } from '../data/checkups';
import { useMyRequests } from '../data/requests';
import { DEPARTMENTS } from '../data/departments';
import { CATEGORIES } from '../data/categories';
import { AvatarSource, canUseCamera, pickAvatar } from '../media/avatarPicker';
import { avatarUploadConfigured, uploadAvatar } from '../media/cloudinary';
import { Client, ServiceRequest, Vehicle } from '../firebase/models';
import { RootStackParamList } from '../navigation/types';
import { formatDate, formatMonthYear, timeAgo } from '../utils/dates';
import { S, useT } from '../i18n';

// Linha secundária de um carro/chão: o checkup em curso quando há um
// (Secção 8); senão a última visita (carro) ou a data de instalação (chão);
// sem data de serviço, quando foi registado.
function vehicleSubtitle(v: Vehicle): string {
  const state = checkupState(v);
  const req = v.checkupRequest;
  const t = S.checkup;
  if (req && state === 'requested') return t.subRequested(formatCheckupSlot({ day: req.day, period: req.period }));
  if (req && state === 'proposed') return t.subProposed(formatCheckupSlot(req));
  if (req && state === 'scheduled') return t.subScheduled(formatCheckupSlot(req));
  if (state === 'declined') return t.subDeclined;
  if (v.lastServiceAt) return v.type === 'floor' ? S.profile.installed(formatDate(v.lastServiceAt)) : S.profile.lastVisit(formatDate(v.lastServiceAt));
  return v.createdAt ? S.profile.registered(formatDate(v.createdAt)) : '';
}

type PrefKey = keyof Client['notificationPrefs'];

// Linha de um pedido: departamento e o que foi pedido, com o estado que a
// equipa lhe deu (Recebido / Em contacto / Fechado).
function RequestRow({ request }: { request: ServiceRequest }) {
  const T = useT();
  const dept = DEPARTMENTS.find((d) => d.id === request.department)?.name ?? request.department;
  const what = request.services.length ? request.services.join(', ') : request.fields[0]?.value || request.message;
  const closed = request.status === 'closed';
  return (
    <View style={styles.assetRow}>
      <View style={styles.assetText}>
        <Text style={styles.assetName} numberOfLines={1}>
          {request.workTitle ? T.profile.similarTo(request.workTitle) : dept}
        </Text>
        <Text style={styles.assetSub} numberOfLines={1}>
          {request.workTitle ? `${dept} · ` : ''}
          {what}
          {request.createdAt ? ` · ${timeAgo(request.createdAt).toLowerCase()}` : ''}
        </Text>
      </View>
      <View style={[styles.assetStatus, closed ? styles.assetStatusOk : styles.assetStatusPending]}>
        <Text style={[styles.assetStatusText, closed ? styles.assetStatusTextOk : styles.assetStatusTextPending]}>{T.requestStatus[request.status]}</Text>
      </View>
    </View>
  );
}

// Perfil do cliente: cabeçalho, ação pendente e carros/chãos vêm do
// Firestore em tempo real (clients/{uid} via useAuth, vehicles por clientId).
// Este ecrã está dentro de AuthGate — há sempre sessão aqui.
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const T = useT();
  const { user, client, updateClient, setMarketingConsent, acceptTerms, needsTermsAcceptance, signOut } = useAuth();
  const { data: vehicles, loading: vehiclesLoading, error: vehiclesError } = useVehicles(user?.uid);
  const pending = pendingCheckup(vehicles);
  // Pedidos de orçamento (Secção 7), em tempo real — o estado muda quando a
  // equipa o altera no backoffice.
  const { data: requests } = useMyRequests(user?.uid);

  // Guarda o toggle localmente enquanto o Firestore confirma, para não saltar.
  const [pendingPrefs, setPendingPrefs] = useState<Partial<Client['notificationPrefs']>>({});
  const [pendingMarketing, setPendingMarketing] = useState<boolean | null>(null);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  // Foto de perfil (Secção 5b): menu no avatar → galeria/câmara → redução
  // no telemóvel → upload para o Cloudinary → clients/{uid}.avatarUrl.
  const [avatarMenu, setAvatarMenu] = useState(false);
  // Fração 0..1 enquanto envia; null quando não há envio.
  const [uploading, setUploading] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Agendamento de checkup (Secção 8): a folha para pedir/alterar, o menu
  // de ações de uma linha da lista, e a confirmação de cancelamento.
  const [sheetVehicle, setSheetVehicle] = useState<Vehicle | null>(null);
  const [rowVehicle, setRowVehicle] = useState<Vehicle | null>(null);
  const [cancelVehicle, setCancelVehicle] = useState<Vehicle | null>(null);
  const [checkupBusy, setCheckupBusy] = useState<string | null>(null);
  const [checkupError, setCheckupError] = useState<string | null>(null);

  const runCheckupAction = async (v: Vehicle, action: () => Promise<void>) => {
    setCheckupBusy(v.id);
    setCheckupError(null);
    try {
      await action();
    } catch (err) {
      setCheckupError(checkupErrorMessage(err));
    } finally {
      setCheckupBusy(null);
    }
  };
  const openSheet = (v: Vehicle) => {
    setRowVehicle(null);
    setCheckupError(null);
    setSheetVehicle(v);
  };
  const confirmProposal = (v: Vehicle) => {
    setRowVehicle(null);
    return runCheckupAction(v, () => confirmCheckupProposal(v.id));
  };
  const askCancel = (v: Vehicle) => {
    setRowVehicle(null);
    setCancelVehicle(v);
  };
  const doCancel = () => {
    const v = cancelVehicle;
    setCancelVehicle(null);
    if (v) runCheckupAction(v, () => cancelCheckupRequest(v.id));
  };
  // Tocar numa linha: sem pedido (ou cancelado) abre logo a folha; com
  // pedido em curso mostra as ações possíveis nesse estado.
  const onRowPress = (v: Vehicle) => {
    const state = checkupState(v);
    if (state === 'todo' || state === 'declined') openSheet(v);
    else if (state !== 'ok') setRowVehicle(v);
  };
  const rowActions: SheetAction[] = (() => {
    const v = rowVehicle;
    if (!v) return [];
    switch (checkupState(v)) {
      case 'requested':
        return [
          { label: T.checkup.changeDay, onPress: () => openSheet(v) },
          { label: T.checkup.cancelRequestLong, onPress: () => askCancel(v), destructive: true },
        ];
      case 'proposed':
        return [
          { label: T.checkup.confirmSlot(v.checkupRequest ? formatCheckupSlot(v.checkupRequest) : null), onPress: () => confirmProposal(v) },
          { label: T.checkup.chooseAnotherDay, onPress: () => openSheet(v) },
          { label: T.checkup.cancelCheckup, onPress: () => askCancel(v), destructive: true },
        ];
      case 'scheduled':
        return [
          { label: T.checkup.changeDay, onPress: () => openSheet(v) },
          { label: T.checkup.cancelCheckup, onPress: () => askCancel(v), destructive: true },
        ];
      default:
        return [];
    }
  })();

  const displayName = client?.name || user?.displayName || user?.email || '';
  const since = formatMonthYear(client?.clientSince);
  const avatarUrl = client?.avatarUrl?.trim() || '';
  const prefs: Client['notificationPrefs'] = {
    automotive: true,
    epoxy: true,
    graphic: true,
    ...client?.notificationPrefs,
    ...pendingPrefs,
  };
  // Opt-in de marketing: desligado até o cliente ligar (RGPD, Secção 3).
  const marketing = pendingMarketing ?? client?.consent?.marketing ?? false;

  const togglePref = async (key: PrefKey) => {
    const next = !prefs[key];
    setPendingPrefs((p) => ({ ...p, [key]: next }));
    try {
      await updateClient({ notificationPrefs: { ...prefs, [key]: next } });
    } finally {
      setPendingPrefs((p) => {
        const { [key]: _drop, ...rest } = p;
        return rest;
      });
    }
  };

  const toggleMarketing = async () => {
    const next = !marketing;
    setPendingMarketing(next);
    try {
      await setMarketingConsent(next);
    } finally {
      setPendingMarketing(null);
    }
  };

  const onAcceptTerms = async () => {
    setAcceptingTerms(true);
    setTermsError(null);
    try {
      await acceptTerms();
    } catch (err) {
      setTermsError(authErrorMessage(err));
    } finally {
      setAcceptingTerms(false);
    }
  };

  // O seletor tem de arrancar ainda dentro do toque (no browser o diálogo de
  // ficheiros só abre com ativação do utilizador), por isso não se espera
  // por nada antes de chamar pickAvatar.
  const changeAvatar = (source: AvatarSource) => {
    setAvatarMenu(false);
    setAvatarError(null);
    const run = async () => {
      const uri = await pickAvatar(source);
      if (!uri || !user) return;
      setUploading(0);
      const url = await uploadAvatar(uri, user.uid, setUploading);
      await updateClient({ avatarUrl: url });
    };
    run()
      .catch((err) => setAvatarError(err instanceof Error ? err.message : T.profile.avatarSaveFailed))
      .finally(() => setUploading(null));
  };

  const removeAvatar = async () => {
    setAvatarMenu(false);
    setAvatarError(null);
    try {
      await updateClient({ avatarUrl: '' });
    } catch (err) {
      setAvatarError(authErrorMessage(err));
    }
  };

  const avatarActions: SheetAction[] = [
    { label: T.photoPicker.fromLibrary, onPress: () => changeAvatar('library') },
    ...(canUseCamera ? [{ label: T.photoPicker.takePhoto, onPress: () => changeAvatar('camera') }] : []),
    ...(avatarUrl ? [{ label: T.profile.removePhoto, onPress: removeAvatar, destructive: true }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Pressable
            style={styles.avatarWrap}
            onPress={() => setAvatarMenu(true)}
            disabled={!client || uploading !== null || !avatarUploadConfigured}
            accessibilityRole="button"
            accessibilityLabel={avatarUrl ? T.profile.avatarA11yChange : T.profile.avatarA11yPick}
          >
            <Avatar url={avatarUrl} name={displayName} size={56} />
            {uploading !== null ? (
              <View style={styles.avatarBusy}>
                <Text style={styles.avatarBusyText}>{Math.round(uploading * 100)}%</Text>
              </View>
            ) : avatarUploadConfigured ? (
              <View style={styles.avatarEdit}>
                <CameraIcon />
              </View>
            ) : null}
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.since}>{since ? T.profile.since(since) : user?.email}</Text>
            {uploading !== null ? (
              <Text style={styles.avatarHint}>{T.profile.avatarUploading}</Text>
            ) : avatarError ? (
              <Text style={styles.avatarErrorText}>{avatarError}</Text>
            ) : null}
          </View>
        </View>

        {needsTermsAcceptance && (
          <View style={styles.termsCard}>
            <Text style={styles.termsTitle}>{T.profile.termsUpdatedTitle}</Text>
            <Text style={styles.termsDesc}>
              {T.profile.termsUpdatedPrefix}
              <Text style={styles.inlineLink} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
                {T.profile.terms}
              </Text>
              {T.profile.termsUpdatedMiddle}
              <Text style={styles.inlineLink} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
                {T.profile.privacy}
              </Text>
              {T.profile.termsUpdatedSuffix}
            </Text>
            {termsError && <Text style={styles.termsError}>{termsError}</Text>}
            <Pressable style={[styles.cta, acceptingTerms && { opacity: 0.6 }]} onPress={onAcceptTerms} disabled={acceptingTerms}>
              {acceptingTerms ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>{T.profile.termsAccept}</Text>}
            </Pressable>
          </View>
        )}

        {/* Passo atual do fluxo de acompanhamento (Secção 8): o carro/chão
            com checkup por fazer, e o estado do pedido — por pedir, a
            aguardar aprovação, proposta da equipa, agendado. Desaparece
            quando está tudo em dia (ou o cliente cancelou). */}
        {pending &&
          (() => {
            const state = checkupState(pending);
            const req = pending.checkupRequest;
            const busy = checkupBusy === pending.id;
            const good = state === 'scheduled';
            const t = T.checkup;
            let title = t.cardTitleTodo(pending.type === 'floor');
            let desc = t.cardDescTodo(pending.name, pending.lastServiceAt ? timeAgo(pending.lastServiceAt) : null);
            if (req && state === 'requested') {
              title = t.cardTitleRequested(formatCheckupSlot({ day: req.day, period: req.period }));
              desc = t.cardDescRequested(pending.name, req.note);
            } else if (req && state === 'proposed') {
              title = t.cardTitleProposed(formatCheckupSlot(req));
              desc = t.cardDescProposed(pending.name, req.teamNote?.trim() || '');
            } else if (req && state === 'scheduled') {
              // A nota da equipa só se mostra se veio com a aprovação; se o
              // cliente confirmou uma proposta, a nota era a pergunta dela.
              const teamNote = !req.confirmedAt ? req.teamNote?.trim() : '';
              title = t.cardTitleScheduled(formatCheckupSlot(req));
              desc = t.cardDescScheduled(pending.name, teamNote || '');
            }
            return (
              <View style={[styles.pendingCard, good && styles.pendingCardOk]}>
                <View style={styles.pendingTag}>
                  <View style={[styles.pendingDot, good && styles.pendingDotOk]} />
                  <Text style={[styles.pendingTagText, good && styles.pendingTagTextOk]}>{t.cardTag[state]}</Text>
                </View>
                <Text style={styles.pendingTitle}>{title}</Text>
                <Text style={styles.pendingDesc}>{desc}</Text>
                {checkupError ? <Text style={styles.checkupError}>{checkupError}</Text> : null}
                <View style={styles.pendingActions}>
                  {state === 'todo' ? (
                    <Pressable style={styles.cta} onPress={() => openSheet(pending)} accessibilityRole="button" accessibilityLabel={t.scheduleNow}>
                      <Text style={styles.ctaText}>{t.scheduleNow}</Text>
                    </Pressable>
                  ) : null}
                  {state === 'proposed' ? (
                    <Pressable
                      style={[styles.cta, busy && { opacity: 0.6 }]}
                      onPress={() => confirmProposal(pending)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={t.confirmA11y}
                    >
                      {busy ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>{t.confirm}</Text>}
                    </Pressable>
                  ) : null}
                  {state !== 'todo' ? (
                    <Pressable
                      style={styles.ctaGhost}
                      onPress={() => openSheet(pending)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={state === 'proposed' ? t.chooseAnotherDay : t.changeDay}
                    >
                      <Text style={styles.ctaGhostText}>{state === 'proposed' ? t.chooseAnotherDay : t.change}</Text>
                    </Pressable>
                  ) : null}
                  {state !== 'todo' ? (
                    <Pressable style={styles.ctaLink} onPress={() => askCancel(pending)} disabled={busy} accessibilityRole="button" accessibilityLabel={t.cancelCheckup}>
                      <Text style={styles.ctaLinkText}>{state === 'requested' ? t.cancelRequest : T.common.cancel}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })()}

        <Text style={styles.secTitle}>{T.profile.vehiclesTitle}</Text>
        <View style={styles.assetList}>
          {vehiclesLoading ? (
            <View style={styles.assetEmpty}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : vehiclesError ? (
            <View style={styles.assetEmpty}>
              <Text style={styles.assetEmptyTitle}>{T.profile.vehiclesError}</Text>
              <Text style={styles.assetEmptyDesc}>{vehiclesError.code}</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <View style={styles.assetEmpty}>
              <Text style={styles.assetEmptyTitle}>{T.profile.vehiclesEmpty}</Text>
              <Text style={styles.assetEmptyDesc}>{T.profile.vehiclesEmptyDesc}</Text>
            </View>
          ) : (
            vehicles.map((v) => {
              const state = checkupState(v);
              const good = state === 'ok' || state === 'scheduled';
              const faint = state === 'declined';
              const actionable = state !== 'ok';
              return (
                <Pressable
                  key={v.id}
                  style={styles.assetRow}
                  onPress={() => onRowPress(v)}
                  disabled={!actionable || checkupBusy === v.id}
                  accessibilityRole={actionable ? 'button' : undefined}
                  accessibilityLabel={actionable ? T.checkup.rowA11y(v.name, T.checkup.rowStatus[state]) : undefined}
                >
                  <View style={styles.assetThumb}>
                    <Photo url={v.photoUrl} seed={v.id} />
                  </View>
                  <View style={styles.assetText}>
                    <Text style={styles.assetName} numberOfLines={1}>
                      {v.name}
                    </Text>
                    <Text style={styles.assetSub}>{vehicleSubtitle(v)}</Text>
                  </View>
                  <View style={[styles.assetStatus, good ? styles.assetStatusOk : faint ? styles.assetStatusFaint : styles.assetStatusPending]}>
                    <Text style={[styles.assetStatusText, good ? styles.assetStatusTextOk : faint ? styles.assetStatusTextFaint : styles.assetStatusTextPending]}>
                      {T.checkup.rowStatus[state]}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <Text style={styles.secTitle}>{T.profile.requestsTitle}</Text>
        <View style={styles.assetList}>
          {requests.length === 0 ? (
            <View style={styles.assetEmpty}>
              <Text style={styles.assetEmptyTitle}>{T.profile.requestsEmpty}</Text>
              <Text style={styles.assetEmptyDesc}>{T.profile.requestsEmptyDesc}</Text>
            </View>
          ) : (
            requests.map((r) => <RequestRow key={r.id} request={r} />)
          )}
          <Pressable style={styles.ghostBtn} onPress={() => navigation.navigate('RequestQuote')} accessibilityRole="button">
            <Text style={styles.ghostBtnText}>{T.profile.requestQuote}</Text>
          </Pressable>
        </View>

        <Text style={styles.secTitle}>{T.profile.notificationsTitle}</Text>
        <View style={styles.prefList}>
          {/* Operacionais: fazem parte do serviço, não dependem de consentimento. */}
          <View style={styles.prefRow}>
            <View style={styles.prefText}>
              <Text style={styles.prefLabel}>{T.profile.operationalLabel}</Text>
              <Text style={styles.prefHint}>{T.profile.operationalHint}</Text>
            </View>
            <View style={styles.alwaysOn}>
              <Text style={styles.alwaysOnText}>{T.profile.always}</Text>
            </View>
          </View>

          {/* Marketing: opt-in explícito, desligado por defeito (RGPD). */}
          <Pressable
            style={[styles.prefRow, !marketing && { borderBottomWidth: 0 }]}
            onPress={toggleMarketing}
            disabled={!client}
            accessibilityRole="switch"
            accessibilityState={{ checked: marketing }}
          >
            <View style={styles.prefText}>
              <Text style={styles.prefLabel}>{T.profile.marketingLabel}</Text>
              <Text style={styles.prefHint}>{T.profile.marketingHint}</Text>
            </View>
            <Toggle on={marketing} />
          </Pressable>

          {marketing &&
            CATEGORIES.map((c, i, arr) => (
              <Pressable
                key={c.key}
                style={[styles.prefRow, styles.prefRowSub, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => togglePref(c.prefKey)}
                disabled={!client}
                accessibilityRole="switch"
                accessibilityState={{ checked: prefs[c.prefKey] }}
              >
                <Text style={styles.prefLabel}>{c.fullName}</Text>
                <Toggle on={prefs[c.prefKey]} />
              </Pressable>
            ))}
        </View>

        <Text style={styles.secTitle}>{T.profile.accountTitle}</Text>
        <View style={styles.accountList}>
          <Pressable style={styles.accountRow} onPress={() => navigation.navigate('PersonalData')}>
            <Text style={styles.accountLabel}>{T.profile.personalData}</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={styles.accountRow} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
            <Text style={styles.accountLabel}>{T.profile.privacy}</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={styles.accountRow} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
            <Text style={styles.accountLabel}>{T.profile.terms}</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={styles.accountRow} onPress={() => signOut()}>
            <Text style={styles.accountLabel}>{T.profile.signOut}</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={[styles.accountRow, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('DeleteAccount')}>
            <Text style={[styles.accountLabel, styles.accountDanger]}>{T.profile.deleteAccount}</Text>
            <ChevronRightIcon color={colors.danger} />
          </Pressable>
        </View>
      </ScrollView>

      <ActionSheet visible={avatarMenu} title={T.profile.avatarMenuTitle} actions={avatarActions} onClose={() => setAvatarMenu(false)} />

      {/* Agendamento de checkup (Secção 8). */}
      <CheckupSheet vehicle={sheetVehicle} onClose={() => setSheetVehicle(null)} />
      <ActionSheet visible={!!rowVehicle} title={rowVehicle?.name} actions={rowActions} onClose={() => setRowVehicle(null)} />
      <ActionSheet
        visible={!!cancelVehicle}
        title={cancelVehicle ? T.checkup.cancelTitle(cancelVehicle.name) : undefined}
        actions={[{ label: T.checkup.cancelYes, onPress: doCancel, destructive: true }]}
        onClose={() => setCancelVehicle(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  avatarWrap: { position: 'relative' },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBusy: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBusyText: { fontFamily: fonts.eyebrow, fontSize: 11, color: colors.goldBright },
  headerText: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  since: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  avatarHint: { fontFamily: fonts.body, fontSize: 10.5, color: colors.goldBright, marginTop: 4 },
  avatarErrorText: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 14, color: colors.danger, marginTop: 4 },
  termsCard: {
    margin: 18,
    marginBottom: 0,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,161,91,0.12)',
  },
  termsTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginBottom: 4 },
  termsDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, lineHeight: 16, marginBottom: 13 },
  termsError: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginBottom: 8 },
  inlineLink: { fontFamily: fonts.bodyBold, color: colors.goldBright, textDecorationLine: 'underline' },
  pendingCard: {
    margin: 18,
    marginBottom: 0,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: 'rgba(198,161,91,0.08)',
  },
  pendingCardOk: { borderColor: 'rgba(183,209,168,0.35)', backgroundColor: 'rgba(183,209,168,0.06)' },
  pendingTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.goldBright },
  pendingDotOk: { backgroundColor: colors.ok },
  pendingTagText: { fontFamily: fonts.eyebrow, fontSize: 8.5, letterSpacing: 1.2, color: colors.goldBright, textTransform: 'uppercase' },
  pendingTagTextOk: { color: colors.ok },
  pendingTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginBottom: 4 },
  pendingDesc: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkMuted, lineHeight: 15, marginBottom: 13 },
  pendingActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  checkupError: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 14, color: colors.danger, marginBottom: 10 },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: '#0b0a08', textTransform: 'uppercase' },
  ctaGhost: { alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, borderColor: colors.hairlineStrong, paddingHorizontal: 14, paddingVertical: 8 },
  ctaGhostText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.6, color: colors.goldBright, textTransform: 'uppercase' },
  ctaLink: { paddingHorizontal: 6, paddingVertical: 8 },
  ctaLinkText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.6, color: colors.inkMuted, textTransform: 'uppercase' },
  secTitle: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 1.6, color: colors.inkMuted, textTransform: 'uppercase', marginHorizontal: 18, marginTop: 22, marginBottom: 10 },
  assetList: { paddingHorizontal: 18, gap: 8 },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 10 },
  assetThumb: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden', backgroundColor: colors.panel2 },
  assetText: { flex: 1 },
  assetName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  assetSub: { fontFamily: fonts.body, fontSize: 9.5, color: colors.inkFaint, marginTop: 1 },
  assetStatus: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  assetStatusOk: { borderWidth: 1, borderColor: 'rgba(183,209,168,0.35)' },
  assetStatusPending: { borderWidth: 1, borderColor: colors.hairlineStrong },
  assetStatusFaint: { borderWidth: 1, borderColor: colors.hairline },
  assetStatusText: { fontFamily: fonts.eyebrow, fontSize: 7, letterSpacing: 0.6, textTransform: 'uppercase' },
  assetStatusTextOk: { color: colors.ok },
  assetStatusTextPending: { color: colors.goldBright },
  assetStatusTextFaint: { color: colors.inkFaint },
  assetEmpty: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 14, gap: 4, alignItems: 'center' },
  ghostBtn: { borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 24, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  ghostBtnText: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  assetEmptyTitle: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkMuted, textAlign: 'center' },
  assetEmptyDesc: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: colors.inkFaint, textAlign: 'center' },
  prefList: { paddingHorizontal: 18 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  prefRowSub: { paddingLeft: 14, paddingVertical: 9 },
  prefText: { flex: 1 },
  prefLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.ink },
  prefHint: { fontFamily: fonts.body, fontSize: 10, color: colors.inkFaint, lineHeight: 14, marginTop: 2 },
  alwaysOn: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(183,209,168,0.35)', paddingHorizontal: 8, paddingVertical: 3 },
  alwaysOnText: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 0.6, color: colors.ok, textTransform: 'uppercase' },
  accountList: { paddingHorizontal: 18, marginTop: 2, marginBottom: 24 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  accountLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
  accountDanger: { color: colors.danger },
});
