import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Redução de imagens no próprio telemóvel antes de subir (foto de perfil,
// fotos de um pedido de orçamento): uma foto de 12 MP passa a umas centenas
// de KB, o envio é rápido e os limites dos presets do Cloudinary ficam só
// como rede de segurança.

// Reduz o lado maior a `max` px e grava em JPEG. Sem dimensões conhecidas
// (pode acontecer no browser) reduz pela largura na mesma.
export async function shrinkImage(uri: string, max: number, width?: number, height?: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (!width || !height) {
    ctx.resize({ width: max });
  } else if (width > max || height > max) {
    if (width >= height) ctx.resize({ width: max });
    else ctx.resize({ height: max });
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return saved.uri;
}
