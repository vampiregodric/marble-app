import { ImageSourcePropType } from 'react-native';

// TRANSITÓRIO. Fotos embutidas na app para trabalhos que ainda não têm
// `photoUrl` no Firestore, indexadas pelo ID do documento. Serve para o
// Jaguar (a única foto real que temos) aparecer enquanto a Secção 5
// (backoffice) não decide onde alojar as fotos. Quando o backoffice
// preencher `photoUrl`, o URL ganha e isto deixa de ser usado — nessa altura
// apaga este ficheiro e os `fallback={LOCAL_WORK_PHOTOS[...]}` nos ecrãs.
export const LOCAL_WORK_PHOTOS: Record<string, ImageSourcePropType> = {
  'work-example': require('../../assets/work-jaguar-purple.jpg'),
};
