import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { shrinkImage } from './images';

// Escolher a foto de perfil: galeria ou câmara, recorte quadrado nativo
// (iOS/Android) e redução a 1024 px no próprio telemóvel antes de subir —
// uma foto de 12 MP passa a ~200 KB, o envio é rápido e o preset do
// Cloudinary (c_limit 1024) fica só como rede de segurança.

export const MAX_AVATAR_DIMENSION = 1024;

// No browser não há câmara pelo expo-image-picker de forma fiável (abre o
// seletor de ficheiros); a opção fica só nos telemóveis.
export const canUseCamera = Platform.OS !== 'web';

export type AvatarSource = 'library' | 'camera';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.9,
  exif: false,
};

// Devolve o URI local da imagem pronta a enviar, ou null se o cliente
// cancelou. Lança Error com mensagem legível quando falta permissão.
// A galeria não precisa de permissão prévia (iOS 14+ e Android 13+ usam o
// seletor do sistema); a câmara precisa.
export async function pickAvatar(source: AvatarSource): Promise<string | null> {
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Sem acesso à câmara. Dá permissão à app nas definições do telemóvel.');
    result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  }
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  // Redução partilhada com as fotos dos pedidos de orçamento (images.ts).
  return shrinkImage(asset.uri, MAX_AVATAR_DIMENSION, asset.width, asset.height);
}
