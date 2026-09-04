import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  EmailAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updateProfile,
  deleteUser,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { COLLECTIONS, Client } from '../firebase/models';
import { LEGAL_VERSION } from '../legal/texts';

export type SignUpInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  // Tem de vir true de uma checkbox NÃO pré-marcada (RGPD). O ecrã valida
  // antes; aqui volta-se a verificar para ninguém criar conta sem aceitar.
  acceptedTerms: boolean;
};
// `avatarUrl: ''` remove a foto de perfil (Secção 5b).
export type ClientUpdate = Partial<Pick<Client, 'name' | 'phone' | 'notificationPrefs' | 'avatarUrl'>>;

type AuthValue = {
  // `initializing` é true só até o Firebase dizer se há sessão guardada.
  initializing: boolean;
  user: User | null;
  // Documento `clients/{uid}` em tempo real; null enquanto carrega ou sem sessão.
  client: Client | null;
  // true quando o cliente ainda não aceitou a LEGAL_VERSION atual (conta
  // antiga, ou textos legais atualizados). O Perfil mostra o pedido.
  needsTermsAcceptance: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateClient: (patch: ClientUpdate) => Promise<void>;
  acceptTerms: () => Promise<void>;
  setMarketingConsent: (granted: boolean) => Promise<void>;
  // Apaga a conta: pede a password outra vez, anonimiza clients/{uid} e
  // remove o utilizador do Auth. Ver comentário em deleteAccount.
  deleteAccount: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const DEFAULT_PREFS: Client['notificationPrefs'] = { automotive: true, epoxy: true, graphic: true };

function clientRef(uid: string) {
  return doc(db, COLLECTIONS.clients, uid);
}

// O ID do doc em `clients` TEM de ser o uid do Auth — as regras do Firestore
// dependem disso (ver models.ts e firestore.rules).
async function createClientDoc(user: User, extra: { name: string; phone?: string; acceptedTerms: boolean }) {
  await setDoc(clientRef(user.uid), {
    name: extra.name,
    email: user.email ?? '',
    phone: extra.phone ?? '',
    notificationPrefs: DEFAULT_PREFS,
    // Sem aceitação registada (doc recriado após falha), o Perfil pede-a.
    ...(extra.acceptedTerms && {
      consent: {
        termsVersion: LEGAL_VERSION,
        termsAcceptedAt: serverTimestamp(),
        marketing: false,
        marketingUpdatedAt: null,
      },
    }),
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
          createClientDoc(user, { name: user.displayName ?? '', acceptedTerms: false }).catch(() => {});
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
      needsTermsAcceptance: !!client && !client.deletedAt && client.consent?.termsVersion !== LEGAL_VERSION,
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signUp({ name, email, phone, password, acceptedTerms }) {
        if (!acceptedTerms) throw new Error('Tens de aceitar os termos para criar conta.');
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await createClientDoc(cred.user, { name: name.trim(), phone: phone.trim(), acceptedTerms: true });
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
      async acceptTerms() {
        if (!user) throw new Error('Sem sessão.');
        // Caminhos com ponto criam o mapa `consent` se ainda não existir
        // (contas anteriores à Secção 3) sem apagar o resto.
        await updateDoc(clientRef(user.uid), {
          'consent.termsVersion': LEGAL_VERSION,
          'consent.termsAcceptedAt': serverTimestamp(),
          'consent.marketing': client?.consent?.marketing ?? false,
          'consent.marketingUpdatedAt': client?.consent?.marketingUpdatedAt ?? null,
          updatedAt: serverTimestamp(),
        });
      },
      async setMarketingConsent(granted) {
        if (!user) throw new Error('Sem sessão.');
        await updateDoc(clientRef(user.uid), {
          'consent.marketing': granted,
          'consent.marketingUpdatedAt': serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      },
      // Sem Cloud Functions (plano gratuito) o cliente não pode apagar
      // `vehicles`/`notifications` (regras: write false) nem garantir uma
      // limpeza atómica. Por isso a conta é ANONIMIZADA: os dados pessoais
      // saem do doc, o histórico de trabalhos fica sem ligação a pessoa
      // nenhuma (política de retenção, ver src/legal/texts.ts), e o
      // utilizador Auth é apagado — deixa de haver login e deixa de haver
      // uid que satisfaça as regras de leitura.
      // Ordem importa: re-autenticar PRIMEIRO, porque deleteUser exige login
      // recente e falharia depois de já termos anonimizado o doc.
      async deleteAccount(password) {
        if (!user?.email) throw new Error('Sem sessão.');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        await updateDoc(clientRef(user.uid), {
          name: '',
          email: '',
          phone: '',
          avatarUrl: deleteField(),
          notificationPrefs: { automotive: false, epoxy: false, graphic: false },
          'consent.marketing': false,
          'consent.marketingUpdatedAt': serverTimestamp(),
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await deleteUser(user);
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
