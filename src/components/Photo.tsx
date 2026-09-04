import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import PlaceholderThumb from './PlaceholderThumb';

// Foto de um trabalho/evento/carro. Preenche o contentor onde é colocada
// (position absolute) — o pai define tamanho, cantos e `overflow: 'hidden'`.
// Mostra o URL público em `url` (Cloudinary, via backoffice); se estiver
// vazio ou falhar a carregar, cai para o gradiente dourado. O gradiente é
// estável por `seed` (normalmente o ID do doc) para o mesmo item ter sempre
// o mesmo tom.
type Props = {
  url?: string | null;
  seed: string;
};

function variantFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 6;
}

export default function Photo({ url, seed }: Props) {
  const [failed, setFailed] = useState(false);
  const trimmed = url && url.trim() ? url.trim() : null;
  // Um URL novo (ex: a equipa trocou a foto) volta a tentar carregar.
  useEffect(() => setFailed(false), [trimmed]);
  const uri = trimmed && !failed ? trimmed : null;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={styles.fill}
        resizeMode="cover"
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
