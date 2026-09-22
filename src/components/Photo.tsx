import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import PlaceholderThumb from './PlaceholderThumb';
import { cloudinaryForWidth } from '../media/cloudinary';

// Foto de um trabalho/evento/carro. Preenche o contentor onde é colocada
// (position absolute) — o pai define tamanho, cantos e `overflow: 'hidden'`.
// Mostra o URL público em `url` (Cloudinary, via backoffice); se estiver
// vazio ou falhar a carregar, cai para o gradiente dourado. O gradiente é
// estável por `seed` (normalmente o ID do doc) para o mesmo item ter sempre
// o mesmo tom.
type Props = {
  url?: string | null;
  seed: string;
  // 'cover' (por defeito) enche o contentor e corta o que sobra — cartões
  // de departamento do Início, cabeçalho da página de departamento, cartões
  // do Portfólio, miniaturas. 'contain' mostra a foto INTEIRA e deixa margem
  // onde a proporção não bate certo (o fundo do contentor aparece): o
  // carrossel dos destaques no Início e a galeria do Detalhe do trabalho —
  // decisão do Fábio (2026-09-09): é a foto do trabalho que tem de se ver
  // completa; os cartões ficam esticados. Quem usa 'contain' deve passar a
  // foto completa, não o thumbnailUrl (esse já vem recortado a 4:3 do
  // backoffice) — ver cloudinaryWhole() em media/cloudinary.ts.
  fit?: 'cover' | 'contain';
  // Largura (em px de layout) com que a foto vai ser mostrada. Com ela, um
  // URL do Cloudinary é reescrito para uma variante desse tamanho
  // (cloudinaryForWidth) em vez da foto de 1600 px que o backoffice grava —
  // uma miniatura de 44 px deixava de descarregar centenas de KB (DES-02 da
  // auditoria de 2026-09-12). Sem `width`, o URL entra tal e qual. Num
  // contentor 'cover' mais alto do que largo, passar a MAIOR das duas medidas.
  width?: number;
};

function variantFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 6;
}

export default function Photo({ url, seed, fit = 'cover', width }: Props) {
  const [failed, setFailed] = useState(false);
  const trimmed = url && url.trim() ? url.trim() : null;
  const sized = trimmed && width ? (cloudinaryForWidth(trimmed, width) ?? trimmed) : trimmed;
  // Um URL novo (ex: a equipa trocou a foto) volta a tentar carregar.
  useEffect(() => setFailed(false), [sized]);
  const uri = sized && !failed ? sized : null;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={styles.fill}
        resizeMode={fit}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return <PlaceholderThumb variant={variantFor(seed)} style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  // width/height explícitos além do position absolute: sem eles o React
  // Native pode usar as dimensões originais da imagem em vez de encher o
  // contentor (visto no Android com imagens embutidas).
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
});
