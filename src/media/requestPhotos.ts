import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { shrinkImage } from './images';
import { S } from '../i18n';

// Fotos do carro/espaço num pedido de orçamento (Secção 7): até 5, da
// galeria (seleção múltipla) ou da câmara, reduzidas a 1600 px no telemóvel
// antes de subir para o Cloudinary (src/media/cloudinary.ts →
// uploadRequestPhoto). A seleção múltipla não permite recorte — e não faz
// falta: é a foto inteira do carro ou do chão que a equipa quer ver.

export const MAX_REQUEST_PHOTO_DIMENSION = 1600;

export const canUseCamera = Platform.OS !== 'web';

// Abre a galeria com seleção múltipla (até `max`) e devolve os URIs locais
// já reduzidos, ou [] se o cliente cancelou. No browser só se pode chamar
// dentro do toque (o seletor de ficheiros exige ativação do utilizador).
export async function pickRequestPhotos(max: number): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: max,
    orderedSelection: true,
    quality: 0.9,
    exif: false,
  });
  if (result.canceled || !result.assets?.length) return [];
  const assets = result.assets.slice(0, max);
  return Promise.all(assets.map((a) => shrinkImage(a.uri, MAX_REQUEST_PHOTO_DIMENSION, a.width, a.height)));
}

// Tira uma foto com a câmara. Lança Error legível quando falta permissão.
export async function takeRequestPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error(S.errors.cameraDenied);
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, exif: false });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return shrinkImage(a.uri, MAX_REQUEST_PHOTO_DIMENSION, a.width, a.height);
}
