import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform, ScrollView, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';
import { WEB_MAX_WIDTH } from '../utils/layout';
import { CHECKUP_LIMITS, CheckupPeriod, Vehicle } from '../firebase/models';
import { checkupErrorMessage, checkupOptions, PERIOD_LABEL, splitCheckupDay, useCheckupAvailability } from '../data/checkups';
import { requestCheckup } from '../data/vehicles';
import FormField from './FormField';

// Folha de agendamento de checkup (Secção 8), no estilo do menu da foto de
// perfil: o cliente escolhe um dia entre os que a equipa abriu
// (settings/checkups), o período (manhã/tarde) e deixa uma nota opcional.
// Grava o pedido em vehicles/{id}.checkupRequest com status 'pending'; a
// equipa aprova ou propõe outro dia no backoffice. Serve para pedir e para
// alterar (vem pré-preenchida com o pedido em curso). Sem calendário nativo
// e sem ícones — só texto, como o resto da app.
type Props = {
  // null = fechada.
  vehicle: Vehicle | null;
  onClose: () => void;
  // Chamado depois de gravar (o Perfil mostra o novo estado em tempo real).
  onSaved?: () => void;
};

export default function CheckupSheet({ vehicle, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const { availability, loading } = useCheckupAvailability();
  const options = useMemo(() => checkupOptions(availability), [availability]);
  const editing = !!vehicle?.checkupRequest && vehicle.checkupRequest.status !== 'cancelled';

  const [day, setDay] = useState<string | null>(null);
  const [period, setPeriod] = useState<CheckupPeriod | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ao abrir: pré-preenche com o pedido em curso (alterar) ou com o primeiro
  // dia disponível (pedir).
  useEffect(() => {
    if (!vehicle) return;
    const req = vehicle.checkupRequest;
    const current = req && req.status !== 'cancelled' ? req : null;
    const currentOpt = current ? options.find((o) => o.day === current.day) : undefined;
    const first = currentOpt ?? options[0];
    setDay(first?.day ?? null);
    setPeriod(current && currentOpt?.periods.includes(current.period) ? current.period : (first?.periods[0] ?? null));
    setNote(current?.note ?? '');
    setBusy(false);
    setError(null);
    // `options` muda quando a disponibilidade chega; só se quer repor ao abrir
    // ou quando ainda não há dia escolhido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, options.length > 0]);

  const selected = options.find((o) => o.day === day) ?? null;
  const periods = selected?.periods ?? [];
  const canSubmit = !!vehicle && !!day && !!period && periods.includes(period) && !busy;

  const submit = async () => {
    if (!vehicle || !day || !period) return;
    setBusy(true);
    setError(null);
    try {
      await requestCheckup(vehicle.id, { day, period, note });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(checkupErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!vehicle} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.backdropWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} accessibilityLabel="Fechar agendamento" />
        <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
          <Text style={styles.eyebrow}>{editing ? 'Alterar o pedido' : 'Checkup gratuito'}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {vehicle?.name ?? ''}
          </Text>

          {loading && options.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : options.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Ainda não há dias abertos para checkups.</Text>
              <Text style={styles.emptyDesc}>A equipa está a organizar a agenda. Tenta mais tarde ou liga-nos para marcar.</Text>
            </View>
          ) : (
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.intro}>
                Escolhe o dia e o período que te dão jeito. A equipa confirma e recebes um alerta quando estiver agendado.
              </Text>

              <Text style={styles.label}>Dia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                {options.map((o) => {
                  const on = o.day === day;
                  const parts = splitCheckupDay(o.day);
                  return (
                    <Pressable
                      key={o.day}
                      style={[styles.dayChip, on && styles.chipOn]}
                      onPress={() => {
                        setDay(o.day);
                        if (!period || !o.periods.includes(period)) setPeriod(o.periods[0] ?? null);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`Dia ${parts.weekdayLong}, ${parts.date}`}
                    >
                      <Text style={[styles.dayChipWeekday, on && styles.chipTextOn]}>{parts.weekday}</Text>
                      <Text style={[styles.dayChipDate, on && styles.chipTextOn]}>{parts.date}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Período</Text>
              <View style={styles.periodRow}>
                {(['morning', 'afternoon'] as CheckupPeriod[]).map((p) => {
                  const available = periods.includes(p);
                  const on = p === period && available;
                  return (
                    <Pressable
                      key={p}
                      style={[styles.periodChip, on && styles.chipOn, !available && styles.chipOff]}
                      onPress={() => available && setPeriod(p)}
                      disabled={!available}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on, disabled: !available }}
                      accessibilityLabel={`Período ${PERIOD_LABEL[p]}`}
                    >
                      <Text style={[styles.periodText, on && styles.chipTextOn, !available && styles.chipTextOff]}>
                        {PERIOD_LABEL[p]}
                        {!available ? ' · fechado' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <FormField
                label="Nota para a equipa (opcional)"
                value={note}
                onChangeText={(t) => setNote(t.slice(0, CHECKUP_LIMITS.noteMax))}
                placeholder="Ex.: só depois das 15h, ou o carro tem um risco novo"
                multiline
                numberOfLines={3}
                style={styles.noteInput}
                maxLength={CHECKUP_LIMITS.noteMax}
                accessibilityLabel="Nota para a equipa"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>
          )}

          <View style={styles.actions}>
            {options.length > 0 ? (
              <Pressable
                style={[styles.cta, !canSubmit && styles.ctaDisabled]}
                onPress={submit}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel={editing ? 'Guardar alteração' : 'Pedir checkup'}
              >
                {busy ? <ActivityIndicator color="#0b0a08" /> : <Text style={styles.ctaText}>{editing ? 'Guardar alteração' : 'Pedir checkup'}</Text>}
              </Pressable>
            ) : null}
            <Pressable style={styles.cancelRow} onPress={onClose} disabled={busy} accessibilityRole="button" accessibilityLabel="Fechar">
              <Text style={styles.cancelText}>{options.length > 0 ? 'Cancelar' : 'Fechar'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    width: '100%',
    ...(Platform.OS === 'web' && { maxWidth: WEB_MAX_WIDTH }),
    maxHeight: '88%',
    backgroundColor: colors.panel2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    paddingTop: 16,
    paddingHorizontal: 18,
  },
  eyebrow: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.6, color: colors.gold, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 18, color: colors.ink, marginTop: 4, marginBottom: 6 },
  body: { flexGrow: 0 },
  intro: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.inkMuted, marginBottom: 14 },
  label: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.4, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: 8 },
  chips: { gap: 8, paddingBottom: 14, paddingRight: 8 },
  dayChip: {
    minWidth: 62,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel,
  },
  dayChipWeekday: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1, color: colors.inkMuted, textTransform: 'uppercase' },
  dayChipDate: { fontFamily: fonts.bodySemibold, fontSize: 12.5, color: colors.ink, marginTop: 2 },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipOff: { opacity: 0.45 },
  chipTextOn: { color: '#0b0a08' },
  chipTextOff: { color: colors.inkFaint },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodChip: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.panel },
  periodText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink },
  noteInput: { minHeight: 68, textAlignVertical: 'top' },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginBottom: 8 },
  center: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  emptyDesc: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: colors.inkMuted, textAlign: 'center' },
  actions: { paddingTop: 6 },
  cta: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
  cancelRow: { marginTop: 8, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.panel },
  cancelText: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
});
