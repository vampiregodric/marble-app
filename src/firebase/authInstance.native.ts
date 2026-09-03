// Versão iOS/Android. Sem isto o Firebase Auth em React Native guarda a sessão
// só em memória e o cliente teria de fazer login de cada vez que abre a app.
// Ver https://expo.fyi/firebase-js-auth-setup
import { initializeAuth } from 'firebase/auth';
// O pacote `firebase` só publica os tipos da versão web do Auth, onde
// `getReactNativePersistence` não existe — em runtime o Metro resolve
// `firebase/auth` para a build react-native, que a exporta. Daí o ts-expect-error.
// @ts-expect-error tipos web não incluem a função react-native
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import app from './app';

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
