import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FirebaseError } from 'firebase/app';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import Checkbox from '../components/Checkbox';
import OptionChips from '../components/OptionChips';
import ActionSheet, { SheetAction } from '../components/ActionSheet';
import { EmptyState, ErrorState } from '../components/ListState';
import { BackIcon } from '../components/Icons';
import LoginScreen from './LoginScreen';
import { useAuth } from '../auth/AuthContext';
import { usePublishedSamples } from '../data/samples';
import {
  createSimulation,
  dailyLimitReached,
  deleteSimulation,
  newSimulationId,
  sourceFromSample,
  sourceFromWork,
  useMySimulations,
  useSimulation,
} from '../data/simulations';
import { useWork } from '../data/works';
import { canUseCamera, pickRequestPhotos, takeRequestPhoto } from '../media/requestPhotos';
import { simulationUploadConfigured, uploadSimulationPhoto } from '../media/cloudinary';
import { Sample, SIMULATION_KIND_CATEGORY, SIMULATION_LIMITS, Simulation, SimulationKind, SimulationSource, WORK_SERVICES, simulationKindOf } from '../firebase/models';
import { RootStackParamList } from '../navigation/types';
import { useAppWidth } from '../utils/layout';
import { useT } from '../i18n';

type Route = RouteProp<RootStackParamList, 'Simulator'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const KINDS: SimulationKind[] = ['floor', 'car'];

// Simulador "como ficaria" (Secção 16). Duas vistas no mesmo ecrã:
// - o FORMULÁRIO: a foto do cliente (câmara ou galeria, reduzida no
//   telemóvel), a amostra (grelha de fotos reais carregadas pela equipa, ou
//   a capa de um trabalho quando se chega pelo Detalhe) e, na primeira vez,
//   a checkbox de consentimento (uma vez por conta — decisão do Fábio,
//   2026-09-09). "Simular" sobe a foto para o Cloudinary e cria o doc;
// - o RESULTADO: escuta `simulations/{id}` em tempo real. Enquanto a Cloud
//   Function gera, e sempre que ela não devolve imagem (falhou, limite do
//   dia), fica a comparação lado a lado — foto do cliente e amostra — que
//   é a abordagem 1 do ROADMAP embutida na 3. Com resultado, "Antes/Depois".
// Quem não tem sessão vê tudo e só ao tocar em "Simular" entra (login num
// modal, sem perder a foto escolhida). Sem ícones decorativos: as únicas
// imagens são a foto do cliente, as amostras e o resultado.
export default function SimulatorScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const T = useT();
  const { user, needsSimulatorConsent, acceptSimulatorConsent } = useAuth();
  const screenW = useAppWidth();
  const heroW = screenW - 36;
  const heroH = Math.round((heroW * 3) / 4);

  // A simulação em vista: a do parâmetro (Perfil) ou a acabada de criar.
  const [activeId, setActiveId] = useState<string | undefined>(params?.simulationId);
  useEffect(() => setActiveId(params?.simulationId), [params?.simulationId]);

  // Trabalho como amostra ("Ver no meu chão/carro" no Detalhe).
  const { data: work, loading: workLoading } = useWork(params?.workId);
  const workSource = useMemo(() => (work ? sourceFromWork(work) : null), [work]);

  const [chosenKind, setChosenKind] = useState<SimulationKind>('floor');
  const kind: SimulationKind = params?.kind ?? (work ? (simulationKindOf(work.category) ?? chosenKind) : chosenKind);
  const kindLocked = !!params?.kind || !!params?.workId;

  const { data: samples, loading: samplesLoading } = usePublishedSamples(SIMULATION_KIND_CATEGORY[kind]);
  const { data: mine } = useMySimulations(user?.uid);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  // 'work' = a capa do trabalho; senão o id da amostra.
  const [selected, setSelected] = useState<string | null>(params?.workId ? 'work' : null);
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [loginVisible, setLoginVisible] = useState(false);

  // Entrou pelo modal: fecha-o e continua onde estava.
  useEffect(() => {
    if (user && loginVisible) setLoginVisible(false);
  }, [user, loginVisible]);

  // Mudar de chão para carro limpa a amostra (as grelhas são diferentes).
  const pickKind = (k: SimulationKind) => {
    setChosenKind(k);
    setSelected(null);
    setServiceFilter(null);
  };

  const addPhoto = (source: 'library' | 'camera') => {
    setPhotoMenu(false);
    setFeedback(null);
    const run = async () => {
      const uri = source === 'camera' ? await takeRequestPhoto() : (await pickRequestPhotos(1))[0];
      if (uri) setPhotoUri(uri);
    };
    // No browser o seletor só abre dentro do toque — nada de esperar antes.
    run().catch((err) => setFeedback(err instanceof Error ? err.message : T.photoPicker.pickFailed));
  };
  const onPickPhoto = () => {
    if (canUseCamera) setPhotoMenu(true);
    else addPhoto('library');
  };
  const photoActions: SheetAction[] = [
    { label: T.simulator.fromLibrary, onPress: () => addPhoto('library') },
    { label: T.simulator.takePhoto, onPress: () => addPhoto('camera') },
  ];

  // Filtro por sistema/serviço: só quando há amostras de mais do que um.
  const services = useMemo(() => {
    const ids = new Set(samples.map((s) => s.service).filter((s): s is NonNullable<Sample['service']> => !!s));
    return WORK_SERVICES.filter((s) => ids.has(s.id));
  }, [samples]);
  const visibleSamples = useMemo(() => (serviceFilter ? samples.filter((s) => s.service === serviceFilter) : samples), [samples, serviceFilter]);

  const source: SimulationSource | null = useMemo(() => {
    if (selected === 'work') return workSource;
    const s = samples.find((x) => x.id === selected);
    return s ? sourceFromSample(s) : null;
  }, [selected, samples, workSource]);

  const showConsent = !user || needsSimulatorConsent;
  const limitReached = !!user && dailyLimitReached(mine);

  const submit = async () => {
    setFeedback(null);
    setConsentError(null);
    if (!photoUri) {
      setFeedback(T.simulator.needPhoto);
      return;
    }
    if (!source) {
      setFeedback(T.simulator.needSample);
      return;
    }
    if (!user) {
      setLoginVisible(true);
      return;
    }
    if (needsSimulatorConsent && !consent) {
      setConsentError(T.simulator.consentRequired);
      return;
    }
    if (limitReached) {
      setFeedback(T.simulator.dailyLimit(SIMULATION_LIMITS.perDayMax));
      return;
    }
    try {
      if (needsSimulatorConsent) {
        setBusy(T.simulator.busyCreate);
        await acceptSimulatorConsent();
      }
      const id = newSimulationId();
      setBusy(T.simulator.busyUpload);
      setProgress(0);
      const photo = await uploadSimulationPhoto(photoUri, id, setProgress);
      setProgress(null);
      setBusy(T.simulator.busyCreate);
      await createSimulation(id, user.uid, { kind, photo, source });
      setActiveId(id);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setFeedback(err instanceof Error && !code ? err.message : T.simulator.createFailed(code));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  // Voltar ao formulário para outra amostra: a foto desta sessão mantém-se.
  const tryAnother = () => {
    setActiveId(undefined);
    setSelected(null);
    setFeedback(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel={T.common.back}>
          <BackIcon />
        </Pressable>
        <Text style={styles.topTitle}>{T.simulator.title}</Text>
        <View style={styles.backBtn} />
      </View>

      {activeId ? (
        <ResultView
          id={activeId}
          heroW={heroW}
          heroH={heroH}
          onRequestQuote={(s) => navigation.navigate('RequestQuote', { simulationId: s.id })}
          onTryAnother={tryAnother}
          onDeleted={() => navigation.goBack()}
          onBack={() => navigation.goBack()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>{T.simulator.eyebrow}</Text>
          <Text style={styles.heading}>{T.simulator.heading[kind]}</Text>
          <Text style={styles.lead}>{T.simulator.lead}</Text>

          {!kindLocked ? (
            <View style={styles.block}>
              <OptionChips options={KINDS.map((k) => ({ key: k, label: T.simulator.kind[k] }))} selected={[kind]} onToggle={(k) => pickKind(k as SimulationKind)} />
            </View>
          ) : null}

          {!simulationUploadConfigured ? <Text style={styles.feedback}>{T.errors.simulationUploadNotConfigured}</Text> : null}

          {/* 1. A foto do cliente */}
          <Text style={styles.stepLabel}>{T.simulator.stepPhoto.toUpperCase()}</Text>
          {photoUri ? (
            <>
              <View style={[styles.hero, { width: heroW, height: heroH }]} accessibilityLabel={T.simulator.photoA11y}>
                <Image source={{ uri: photoUri }} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors />
              </View>
              <Pressable onPress={onPickPhoto} disabled={!!busy} hitSlop={8} accessibilityRole="button" style={styles.changePhoto}>
                <Text style={styles.linkText}>{T.simulator.changePhoto}</Text>
              </Pressable>
            </>
          ) : (
            <View style={[styles.hero, styles.heroEmpty, { width: heroW, height: Math.round(heroH * 0.62) }]}>
              <View style={styles.pickRow}>
                {canUseCamera ? (
                  <Pressable style={styles.pickBtn} onPress={() => addPhoto('camera')} accessibilityRole="button">
                    <Text style={styles.pickBtnText}>{T.simulator.takePhoto}</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.pickBtn} onPress={() => addPhoto('library')} accessibilityRole="button">
                  <Text style={styles.pickBtnText}>{T.simulator.fromLibrary}</Text>
                </Pressable>
              </View>
            </View>
          )}
          <Text style={styles.hint}>{T.simulator.photoHint[kind]}</Text>

          {/* 2. A amostra */}
          <Text style={styles.stepLabel}>{T.simulator.stepSample.toUpperCase()}</Text>
          {services.length > 1 ? (
            <View style={styles.block}>
              <OptionChips
                options={[{ key: '', label: T.simulator.allSamples }, ...services.map((s) => ({ key: s.id, label: (T.workServices as Record<string, string>)[s.id] ?? s.label }))]}
                selected={[serviceFilter ?? '']}
                onToggle={(k) => setServiceFilter(k || null)}
              />
            </View>
          ) : null}
          {samplesLoading || (params?.workId && workLoading) ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
          ) : (
            <SampleGrid
              width={heroW}
              samples={visibleSamples}
              workSource={workSource}
              selected={selected}
              onSelect={setSelected}
              emptyTitle={T.simulator.samplesEmpty}
              emptyDesc={T.simulator.samplesEmptyDesc}
            />
          )}

          {showConsent ? (
            <View style={styles.consent}>
              <Checkbox
                checked={consent}
                onChange={(v) => {
                  setConsent(v);
                  if (v) setConsentError(null);
                }}
                error={consentError ?? undefined}
              >
                {T.simulator.consentPrefix}
                <Text style={styles.inlineLink} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
                  {T.login.privacyLink}
                </Text>
                {T.simulator.consentSuffix}
              </Checkbox>
            </View>
          ) : (
            <Text style={styles.consentNote}>{T.simulator.consentNote}</Text>
          )}

          {limitReached ? <Text style={styles.feedback}>{T.simulator.dailyLimit(SIMULATION_LIMITS.perDayMax)}</Text> : null}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          {!user ? <Text style={styles.loginLead}>{T.simulator.loginLead}</Text> : null}

          <Pressable
            style={[styles.cta, (busy || limitReached || !simulationUploadConfigured) && styles.ctaBusy]}
            onPress={submit}
            disabled={!!busy || limitReached || !simulationUploadConfigured}
            accessibilityRole="button"
          >
            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color="#0b0a08" />
                <Text style={styles.ctaText}>
                  {busy}
                  {progress !== null ? ` ${Math.round(progress * 100)}%` : ''}
                </Text>
              </View>
            ) : (
              <Text style={styles.ctaText}>{user ? T.simulator.simulate : T.simulator.loginToSimulate}</Text>
            )}
          </Pressable>
        </ScrollView>
      )}

      <ActionSheet visible={photoMenu} title={T.photoPicker.addTitle} actions={photoActions} onClose={() => setPhotoMenu(false)} />

      {/* Login sem sair do simulador: a foto e a amostra escolhidas ficam. */}
      <Modal visible={loginVisible} animationType="slide" onRequestClose={() => setLoginVisible(false)}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.modalBar}>
            <Pressable onPress={() => setLoginVisible(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={T.common.close}>
              <Text style={styles.linkText}>{T.common.close}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
        <LoginScreen />
      </Modal>
    </SafeAreaView>
  );
}

// Grelha de amostras: fotos reais (a textura ou a cor), 3 por linha, nome
// por baixo. A capa do trabalho (quando se vem do Detalhe) é o primeiro
// quadrado. Marcada = contorno dourado e nome em dourado.
function SampleGrid({
  width,
  samples,
  workSource,
  selected,
  onSelect,
  emptyTitle,
  emptyDesc,
}: {
  width: number;
  samples: Sample[];
  workSource: SimulationSource | null;
  selected: string | null;
  onSelect: (id: string) => void;
  emptyTitle: string;
  emptyDesc: string;
}) {
  const T = useT();
  const gap = 10;
  const tile = Math.floor((width - gap * 2) / 3);
  const items: { key: string; name: string; sub?: string; photo?: string; seed: string }[] = [];
  if (workSource) items.push({ key: 'work', name: T.simulator.fromWork(workSource.name), photo: workSource.thumbnailUrl || workSource.photoUrl, seed: workSource.id });
  for (const s of samples) {
    const sub = [s.service ? (T.workServices as Record<string, string>)[s.service] : null, s.finish ? T.simulator.finish[s.finish] : null, s.brand].filter(Boolean).join(' · ');
    items.push({ key: s.id, name: s.name, sub: sub || undefined, photo: s.thumbnailUrl || s.photoUrl, seed: s.id });
  }
  if (items.length === 0) {
    return (
      <View style={styles.samplesEmpty}>
        <Text style={styles.samplesEmptyTitle}>{emptyTitle}</Text>
        <Text style={styles.samplesEmptyDesc}>{emptyDesc}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.grid, { gap }]} accessibilityRole="radiogroup">
      {items.map((it) => {
        const on = selected === it.key;
        return (
          <Pressable
            key={it.key}
            style={[styles.tile, { width: tile }]}
            onPress={() => onSelect(it.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={T.simulator.sampleA11y(it.name)}
          >
            <View style={[styles.tilePhoto, { height: tile }, on && styles.tileOn]}>
              <Photo url={it.photo} seed={it.seed} />
            </View>
            <Text style={[styles.tileName, on && styles.tileNameOn]} numberOfLines={2}>
              {it.name}
            </Text>
            {it.sub ? (
              <Text style={styles.tileSub} numberOfLines={1}>
                {it.sub}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Uma simulação já pedida, em tempo real. A comparação lado a lado é a
// vista por defeito: enquanto gera, e quando não há resultado.
function ResultView({
  id,
  heroW,
  heroH,
  onRequestQuote,
  onTryAnother,
  onDeleted,
  onBack,
}: {
  id: string;
  heroW: number;
  heroH: number;
  onRequestQuote: (s: Simulation) => void;
  onTryAnother: () => void;
  onDeleted: () => void;
  onBack: () => void;
}) {
  const T = useT();
  const { data: sim, loading, missing, error } = useSimulation(id);
  const [showBefore, setShowBefore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (error) return <ErrorState error={error} />;
  if (missing || !sim) {
    return <EmptyState title={T.simulator.unavailableTitle} description={T.simulator.unavailableDesc} actionLabel={T.common.back} onAction={onBack} />;
  }

  const done = sim.status === 'done' && !!sim.result;
  const pending = sim.status === 'pending';
  const problem = sim.status === 'failed' ? T.simulator.failed : sim.status === 'limited' ? T.simulator.limited : sim.status === 'capped' ? T.simulator.capped : null;
  const problemHint = sim.status === 'failed' ? T.simulator.failedHint : sim.status === 'limited' ? T.simulator.limitedHint : sim.status === 'capped' ? T.simulator.cappedHint : null;
  const sourceSub = [
    sim.source.service ? (T.workServices as Record<string, string>)[sim.source.service] : null,
    sim.source.finish ? T.simulator.finish[sim.source.finish] : null,
    sim.source.brand,
  ]
    .filter(Boolean)
    .join(' · ');

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSimulation(sim.id);
      onDeleted();
    } catch {
      setDeleteError(T.simulator.deleteFailed);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>{done ? (showBefore ? T.simulator.yourPhoto : T.simulator.badge) : T.simulator.eyebrow}</Text>
      <Text style={styles.heading}>{sim.source.name}</Text>

      <View style={[styles.hero, { width: heroW, height: heroH }]}>
        {done && !showBefore ? (
          <Photo url={sim.result!.url} seed={sim.id} fit="contain" />
        ) : done && showBefore ? (
          <Photo url={sim.photo.url} seed={sim.id} fit="contain" />
        ) : (
          <SideBySide sim={sim} />
        )}
        {pending ? (
          <View style={styles.generating}>
            <ActivityIndicator color={colors.goldBright} />
            <Text style={styles.generatingText}>{T.simulator.generating}</Text>
          </View>
        ) : null}
      </View>

      {done ? (
        <View style={styles.beforeAfter}>
          <OptionChips
            options={[
              { key: 'before', label: T.simulator.before },
              { key: 'after', label: T.simulator.after },
            ]}
            selected={[showBefore ? 'before' : 'after']}
            onToggle={(k) => setShowBefore(k === 'before')}
          />
        </View>
      ) : null}

      {pending ? <Text style={styles.hint}>{T.simulator.generatingHint}</Text> : null}
      {problem ? (
        <View style={styles.problem}>
          <Text style={styles.problemTitle}>{problem}</Text>
          <Text style={styles.problemDesc}>{problemHint}</Text>
        </View>
      ) : null}

      <View style={styles.sourceCard}>
        <View style={styles.sourceThumb}>
          <Photo url={sim.source.thumbnailUrl || sim.source.photoUrl} seed={sim.source.id} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sourceEyebrow}>{sim.source.type === 'work' ? T.simulator.fromWork('').replace(': ', '') : T.simulator.sampleLabel}</Text>
          <Text style={styles.sourceTitle} numberOfLines={2}>
            {sim.source.name}
          </Text>
          {sourceSub ? <Text style={styles.sourceSub}>{sourceSub}</Text> : null}
        </View>
      </View>

      {done ? <Text style={styles.note}>{T.simulator.resultNote}</Text> : null}

      {!pending ? (
        <Pressable style={styles.cta} onPress={() => onRequestQuote(sim)} accessibilityRole="button">
          <Text style={styles.ctaText}>{T.simulator.requestQuote}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.ghost} onPress={onTryAnother} accessibilityRole="button">
        <Text style={styles.ghostText}>{T.simulator.tryAnother}</Text>
      </Pressable>
      {deleteError ? <Text style={styles.feedback}>{deleteError}</Text> : null}
      <Pressable style={styles.deleteBtn} onPress={() => setConfirmDelete(true)} disabled={deleting} accessibilityRole="button">
        <Text style={styles.deleteText}>{T.simulator.delete}</Text>
      </Pressable>

      <ActionSheet
        visible={confirmDelete}
        title={T.simulator.deleteTitle}
        description={T.simulator.deleteDesc}
        actions={[{ label: T.simulator.deleteYes, destructive: true, onPress: remove }]}
        onClose={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}

// Foto do cliente à esquerda, amostra à direita, com a etiqueta de cada uma.
function SideBySide({ sim }: { sim: Simulation }) {
  const T = useT();
  return (
    <View style={styles.side}>
      <View style={styles.sideHalf}>
        <Photo url={sim.photo.url} seed={sim.id} />
        <View style={styles.sideLabelWrap}>
          <Text style={styles.sideLabel}>{T.simulator.yourPhoto.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.sideDivider} />
      <View style={styles.sideHalf}>
        <Photo url={sim.source.photoUrl} seed={sim.source.id} />
        <View style={styles.sideLabelWrap}>
          <Text style={styles.sideLabel}>{T.simulator.sampleLabel.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 1.4, color: colors.ink, textTransform: 'uppercase' },
  modalBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 18, paddingVertical: 10 },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 36 },
  eyebrow: { fontFamily: fonts.eyebrow, fontSize: 9, letterSpacing: 1.5, color: colors.goldBright, textTransform: 'uppercase' },
  heading: { fontFamily: fonts.bodyExtraBold, fontSize: 20, lineHeight: 25, color: colors.ink, marginTop: 4 },
  lead: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.inkMuted, marginTop: 6, marginBottom: 14 },
  block: { marginBottom: 14 },
  stepLabel: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 2, color: colors.inkMuted, marginTop: 10, marginBottom: 10 },
  hero: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline },
  heroEmpty: { borderStyle: 'dashed', borderColor: colors.hairlineStrong, alignItems: 'center', justifyContent: 'center' },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingHorizontal: 16 },
  pickBtn: { borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: colors.panel },
  pickBtnText: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  changePhoto: { alignSelf: 'flex-start', marginTop: 8 },
  linkText: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  hint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.inkFaint, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {},
  tilePhoto: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.panel2 },
  tileOn: { borderWidth: 2, borderColor: colors.gold },
  tileName: { fontFamily: fonts.bodySemibold, fontSize: 11, lineHeight: 14, color: colors.ink, marginTop: 6 },
  tileNameOn: { color: colors.goldBright },
  tileSub: { fontFamily: fonts.body, fontSize: 9.5, color: colors.inkFaint, marginTop: 2 },
  samplesEmpty: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 14, gap: 4, alignItems: 'center' },
  samplesEmptyTitle: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkMuted, textAlign: 'center' },
  samplesEmptyDesc: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: colors.inkFaint, textAlign: 'center' },
  consent: { marginTop: 18 },
  consentNote: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: colors.inkFaint, marginTop: 18, marginBottom: 12 },
  inlineLink: { fontFamily: fonts.bodyBold, color: colors.goldBright, textDecorationLine: 'underline' },
  loginLead: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: colors.inkMuted, marginBottom: 10 },
  feedback: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.danger, marginBottom: 12 },
  cta: { backgroundColor: colors.gold, borderRadius: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaBusy: { opacity: 0.6 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
  ghost: { borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 24, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ghostText: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  deleteBtn: { alignSelf: 'center', marginTop: 16, paddingVertical: 6, paddingHorizontal: 10 },
  deleteText: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.8, color: colors.danger, textTransform: 'uppercase' },
  // Resultado.
  generating: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
  generatingText: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 1.2, color: colors.goldBright, textTransform: 'uppercase' },
  beforeAfter: { marginTop: 12, alignItems: 'center' },
  problem: { marginTop: 14, borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 12, padding: 12, backgroundColor: 'rgba(198,161,91,0.08)' },
  problemTitle: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink },
  problemDesc: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: colors.inkMuted, marginTop: 4 },
  sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 12, backgroundColor: colors.panel, marginTop: 14 },
  sourceThumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline },
  sourceEyebrow: { fontFamily: fonts.eyebrow, fontSize: 8.5, letterSpacing: 1.2, color: colors.goldBright, textTransform: 'uppercase' },
  sourceTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginTop: 2 },
  sourceSub: { fontFamily: fonts.body, fontSize: 10.5, color: colors.inkFaint, marginTop: 2 },
  note: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.inkFaint, marginTop: 12, marginBottom: 14 },
  side: { flex: 1, flexDirection: 'row' },
  sideHalf: { flex: 1, overflow: 'hidden' },
  sideDivider: { width: 2, backgroundColor: colors.gold },
  sideLabelWrap: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  sideLabel: { fontFamily: fonts.eyebrow, fontSize: 7.5, letterSpacing: 0.8, color: colors.goldBright },
});
