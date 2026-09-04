import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, fonts } from '../theme/theme';
import { BackIcon } from '../components/Icons';
import { DEPARTMENTS } from '../data/departments';
import { RootStackParamList } from '../navigation/types';

// ECRÃ DE RESERVA (Secção 9). A Secção 7 — Ecrã de pedido de orçamento
// constrói o formulário a sério e substitui este ficheiro por completo; a
// rota e os params ({ workId?, department? }) são o contrato entre as duas.
// Até lá, quem toca em "Pedir proposta" numa página de departamento vê
// isto: "em breve" e um contacto por email, para não ficar sem saída.
const CONTACT_EMAIL = 'app@marble.pt';

export default function RequestQuoteScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'RequestQuote'>>();
  const department = DEPARTMENTS.find((d) => d.id === params?.department);
  const subject = encodeURIComponent(department ? `Pedido de proposta — ${department.name}` : 'Pedido de orçamento');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar">
          <BackIcon />
        </Pressable>
      </View>
      <View style={styles.body}>
        {department ? <Text style={styles.eyebrow}>{department.name}</Text> : null}
        <Text style={styles.title}>Pedido de orçamento</Text>
        <Text style={styles.text}>
          O formulário de pedido está quase pronto. Até lá, escreve-nos por email com o que precisas e respondemos-te em breve.
        </Text>
        <Pressable
          style={styles.btn}
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}`).catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel={`Escrever para ${CONTACT_EMAIL}`}
        >
          <Text style={styles.btnText}>Escrever para {CONTACT_EMAIL}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, minHeight: 42 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
  eyebrow: { fontFamily: fonts.eyebrow, fontSize: 9.5, letterSpacing: 1.6, color: colors.gold, textTransform: 'uppercase' },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 24, color: colors.ink, marginTop: 4 },
  text: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.inkMuted, marginTop: 12 },
  btn: { marginTop: 22, backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnText: { fontFamily: fonts.eyebrow, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#0b0a08', textTransform: 'uppercase' },
});
