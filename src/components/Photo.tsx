import React, { useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';
import PlaceholderThumb from './PlaceholderThumb';

// Foto de um trabalho/evento/carro. Preenche o contentor onde é colocada
// (position absolute) — o pai define tamanho, cantos e `overflow: 'hidden'`.
// Mostra o URL público em `url`; se estiver vazio ou falhar a carregar, cai
// para `fallback` (recurso embutido) e por fim para o gradiente dourado. O
// gradiente é estável por `seed` (normalmente o ID do doc) para o mesmo item
// ter sempre o mesmo tom.
type Props = {
  url?: string | null;
  fallback?: ImageSourcePropType;
  seed: string;
};

function variantFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 6;
}

export default function Photo({ url, fallback, seed }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = url && url.trim() && !failed ? url.trim() : null;

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
  if (fallback) {
    return <Image source={fallback} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors />;
  }
  return <PlaceholderThumb variant={variantFor(seed)} style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  // width/height explícitos são obrigatórios: com uma imagem embutida
  // (require), o React Native usa as dimensões originais do ficheiro quando
  // o estilo não as define — a foto ficava no tamanho real, ancorada ao
  // canto superior esquerdo, e só se via o preto do fundo.
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
});
