import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { COLLECTIONS, Client } from '../firebase/models';

export type SignUpInput = { name: string; email: string; phone: string; password: string };
export type ClientUpdate = Partial<Pick<Client, 'name' | 'phone' | 'notificationPrefs'>>;

type AuthValue = {
  // `initializing` é true só até o Firebase dizer se há sessão guardada.
  initializing: boolean;
  user: User | null;
  // Documento `clients/{uid}` em tempo real; null enquanto carrega ou sem sessão.
  client: Client | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateClient: (patch: ClientUpdate) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const DEFAULT_PREFS: Client['notificationPrefs'] = { automotive: true, epoxy: true, graphic: true };

function clientRef(uid: string) {
  return doc(db, COLLECTIONS.clients, uid);
}

// O ID do doc em `clients` TEM de ser o uid do Auth — as regras do Firestore
// dependem disso (ver models.ts e firestore.rules).
async function createClientDoc(user: User, extra: { name: string; phone?: string }) {
  await setDoc(clientRef(user.uid), {
    name: extra.name,
    email: user.email ?? '',
    phone: extra.phone ?? '',
    notificationPrefs: DEFAULT_PREFS,
    clientSince: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setClient(null);
      return;
    }
    return onSnapshot(
      clientRef(user.uid),
      (snap) => {
        if (snap.exists()) {
          setClient({ id: snap.id, ...(snap.data() as Omit<Client, 'id'>) });
        } else {
          // Conta existe no Auth mas o doc falhou ao criar (ex: rede caiu a meio
          // do registo). Cria com o que sabemos para o Perfil não ficar vazio.
          createClientDoc(user, { name: user.displayName ?? '' }).catch(() => {});
        }
      },
      () => setClient(null)
    );
  }, [user]);

  const value = useMemo<AuthValue>(
    () => ({
      initializing,
      user,
      client,
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signUp({ name, email, phone, password }) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await createClientDoc(cred.user, { name: name.trim(), phone: phone.trim() });
      },
      async signOut() {
        await fbSignOut(auth);
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email.trim());
      },
      async updateClient(patch) {
        if (!user) throw new Error('Sem sessão.');
        await updateDoc(clientRef(user.uid), { ...patch, updatedAt: serverTimestamp() });
        if (patch.name && patch.name !== user.displayName) {
          await updateProfile(user, { displayName: patch.name });
        }
      },
    }),
    [initializing, user, client]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>.');
  return ctx;
}
