import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import { BackIcon } from '../components/Icons';
import { LEGAL, LEGAL_VERSION } from '../legal/texts';
import { RootStackParamList } from '../navigation/types';
import { useT } from '../i18n';

// Política de privacidade ou termos de utilização (param `doc`). Fica fora
// do AuthGate de propósito: tem de ser legível ANTES de criar conta. O texto
// vive em src/legal/texts.ts, partilhado com as páginas HTML de docs/legal/.
// Só existe em português (Secção 12: a revisão jurídica é de um texto); em
// inglês o ecrã avisa disso numa linha, por cima do texto.
export default function LegalScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Legal'>>();
  const text = LEGAL[params.doc];
  const T = useT();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel={T.common.back}>
          <BackIcon />
        </Pressable>
        <Text style={styles.topTitle}>{text.shortTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{T.legal.version(LEGAL_VERSION)}</Text>
        {T.legal.portugueseOnly ? <Text style={styles.notice}>{T.legal.portugueseOnly}</Text> : null}
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.intro}>{text.intro}</Text>

        {text.sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {s.paragraphs.map((p, i) => (
              <Text key={`p${i}`} style={styles.paragraph}>
                {p}
              </Text>
            ))}
            {s.bullets?.map((b, i) => (
              <View key={`b${i}`} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
            {s.after?.map((p, i) => (
              <Text key={`a${i}`} style={[styles.paragraph, styles.paragraphAfter]}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.eyebrow, fontSize: 11, letterSpacing: 1.4, color: colors.ink, textTransform: 'uppercase' },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },
  eyebrow: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.6, color: colors.gold, textTransform: 'uppercase' },
  notice: { fontFamily: fonts.bodySemibold, fontSize: 12, lineHeight: 17, color: colors.inkMuted, marginTop: 8, borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 24, color: colors.ink, marginTop: 4 },
  intro: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 10 },
  section: { marginTop: 24 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 8 },
  paragraph: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.inkMuted, marginBottom: 8 },
  paragraphAfter: { marginTop: 2 },
  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingRight: 6 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 7 },
  bulletText: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.inkMuted },
});
