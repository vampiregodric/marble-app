import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/theme';
import Photo from '../components/Photo';
import { EmptyState } from '../components/ListState';
import { BackIcon } from '../components/Icons';
import { DEPARTMENTS } from '../data/departments';
import { departmentContent, DepartmentCta } from '../data/departmentContent';
import { useHomeSettings } from '../data/settings';
import { usePublishedWorks } from '../data/works';
import { WorkCategory } from '../firebase/models';
import { RootStackParamList } from '../navigation/types';
import { timeAgo } from '../utils/dates';
import { useAppWidth } from '../utils/layout';

type Route = RouteProp<RootStackParamList, 'Department'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

// Página de serviços de um departamento (Secção 9), aberta pelo cartão do
// Início. É genérica: o nome e a tagline vêm de DEPARTMENTS, os textos de
// src/data/departmentContent.ts e a foto do topo de settings/home (a mesma
// que o cartão usa, escolhida pela equipa no backoffice; sem foto, o
// gradiente). Departamentos com portfólio mostram ainda os trabalhos
// recentes da categoria, com fotos reais, e ligam ao Portfólio filtrado.
// Sem ícones decorativos (regra 5 do CLAUDE.md): os números dos passos
// são informação, e as únicas imagens são fotos.
export default function DepartmentScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const department = DEPARTMENTS.find((d) => d.id === params.id);
  const content = department ? departmentContent(department.id) : undefined;
  const { data: home } = useHomeSettings();
  const cover = home?.departmentCovers?.[params.id];
  const screenW = useAppWidth();
  const heroW = screenW - 36;
  // 4:3 como o Detalhe, para a foto respirar.
  const heroH = Math.round((heroW * 3) / 4);

  // O id pode vir de um URL (web) — se não existir, não rebenta.
  if (!department || !content) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header onBack={() => navigation.goBack()} />
        <EmptyState
          title="Esta página não está disponível."
          description="Volta ao Início para ver os nossos serviços."
          actionLabel="Voltar"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const onCta = (cta: DepartmentCta) => {
    if (cta.kind === 'link') Linking.openURL(cta.url).catch(() => {});
    else navigation.navigate('RequestQuote', { department: department.id });
  };

  const openPortfolio = (category: WorkCategory) => navigation.navigate('Tabs', { screen: 'Portfolio', params: { category } });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { width: heroW, height: heroH }]}>
          <Photo url={cover?.photoUrl || cover?.thumbnailUrl} seed={department.id} />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.9)']}
            locations={[0.3, 0.6, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {department.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{department.badge}</Text>
            </View>
          ) : null}
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>{department.tagline}</Text>
            <Text style={styles.heroTitle}>{department.name}</Text>
            <Text style={styles.heroHeadline}>{content.headline}</Text>
          </View>
        </View>

        <Text style={styles.intro}>{content.intro}</Text>

        <SectionLabel text="O que fazemos" />
        <View style={styles.blocks}>
          {content.services.map((s) => (
            <View key={s.title} style={styles.block}>
              <Text style={styles.blockTitle}>{s.title}</Text>
              <Text style={styles.blockText}>{s.text}</Text>
            </View>
          ))}
        </View>

        <SectionLabel text="Como funciona" />
        <View style={styles.steps}>
          {content.steps.map((s, i) => {
            const last = i === content.steps.length - 1;
            return (
              <View key={s.title} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  {!last ? <View style={styles.stepLine} /> : null}
                </View>
                <View style={[styles.stepBody, last && styles.stepBodyLast]}>
                  <Text style={styles.blockTitle}>{s.title}</Text>
                  <Text style={styles.blockText}>{s.text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {department.category ? (
          <RecentWorks
            category={department.category}
            onOpen={(workId) => navigation.navigate('WorkDetail', { workId })}
            onSeeAll={() => openPortfolio(department.category!)}
          />
        ) : null}

        {content.pricing ? (
          <>
            <SectionLabel text="Investimento" />
            <Text style={styles.pricing}>{content.pricing}</Text>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.ctaBar}>
        <Pressable style={styles.ctaBtn} onPress={() => onCta(content.cta)} accessibilityRole="button" accessibilityLabel={content.cta.label}>
          <Text style={styles.ctaText}>{content.cta.label}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar">
        <BackIcon />
      </Pressable>
    </View>
  );
}

// Rótulo de secção com linha, igual ao "OS NOSSOS SERVIÇOS" do Início.
function SectionLabel({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{text.toUpperCase()}</Text>
      <View style={styles.labelLine} />
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={action}>
          <Text style={styles.labelAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Trabalhos publicados mais recentes da categoria do departamento — fotos
// reais em vez de ilustrações. Reutiliza a escuta do Portfólio (uma query,
// sem índice novo) e filtra em memória.
function RecentWorks({ category, onOpen, onSeeAll }: { category: WorkCategory; onOpen: (workId: string) => void; onSeeAll: () => void }) {
  const { data: works, loading } = usePublishedWorks();
  const recent = useMemo(() => works.filter((w) => w.category === category).slice(0, 6), [works, category]);
  if (loading) return null;

  return (
    <>
      <SectionLabel text="Trabalhos recentes" action="Ver portfólio" onAction={onSeeAll} />
      {recent.length === 0 ? (
        <Text style={styles.recentEmpty}>Ainda não há trabalhos publicados nesta categoria.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
          {recent.map((w) => (
            <Pressable key={w.id} style={styles.recentCard} onPress={() => onOpen(w.id)} accessibilityRole="button" accessibilityLabel={w.title}>
              <Photo url={w.photoUrl} seed={w.id} />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
                locations={[0.45, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.recentCaption}>
                <Text style={styles.recentTitle} numberOfLines={2}>
                  {w.title}
                </Text>
                <Text style={styles.recentTime}>{timeAgo(w.completedAt)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, minHeight: 42 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 28 },
  hero: { marginHorizontal: 18, marginTop: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline },
  badge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.eyebrow, fontSize: 8, letterSpacing: 1, color: colors.goldBright, textTransform: 'uppercase' },
  heroText: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  heroEyebrow: { fontFamily: fonts.eyebrow, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.goldBright, marginBottom: 4 },
  heroTitle: { fontFamily: fonts.bodyExtraBold, fontSize: 22, lineHeight: 26, color: colors.ink },
  heroHeadline: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 17, color: colors.ink, opacity: 0.85, marginTop: 4 },
  intro: { paddingHorizontal: 18, marginTop: 16, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.inkMuted },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 24, marginBottom: 12 },
  label: { fontFamily: fonts.eyebrow, fontSize: 10.5, letterSpacing: 2, color: colors.inkMuted },
  labelLine: { flex: 1, height: 1, backgroundColor: colors.hairline },
  labelAction: { fontFamily: fonts.eyebrow, fontSize: 10, letterSpacing: 0.8, color: colors.goldBright, textTransform: 'uppercase' },
  blocks: { paddingHorizontal: 18, gap: 10 },
  block: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 14 },
  blockTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 4 },
  blockText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  steps: { paddingHorizontal: 18 },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { width: 26, alignItems: 'center' },
  stepNumber: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.hairlineStrong, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: fonts.eyebrow, fontSize: 11, color: colors.goldBright },
  stepLine: { flex: 1, width: 1, backgroundColor: colors.hairline, marginVertical: 4 },
  stepBody: { flex: 1, paddingBottom: 18, paddingTop: 3 },
  stepBodyLast: { paddingBottom: 0 },
  recentRow: { paddingHorizontal: 18, gap: 10 },
  recentCard: { width: 156, height: 110, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.panel2 },
  recentCaption: { position: 'absolute', left: 10, right: 10, bottom: 9 },
  recentTitle: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, color: colors.ink },
  recentTime: { fontFamily: fonts.body, fontSize: 9, color: colors.inkMuted, marginTop: 2 },
  recentEmpty: { paddingHorizontal: 18, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.inkFaint },
  pricing: { paddingHorizontal: 18, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.inkMuted },
  ctaBar: { padding: 18, borderTopWidth: 1, borderTopColor: colors.hairline },
  ctaBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ctaText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
});
