#!/usr/bin/env node
// Popula um projeto Firebase Marble Studios com um documento de exemplo em
// cada coleção (clients, vehicles, works, events, notifications).
//
// Uso:
//   node scripts/seed-firestore.mjs ./serviceAccountKey.dev.json
//
// A chave de service account descarrega-se em:
// Firebase Console > [projeto] > Definições do projeto (engrenagem) >
// Contas de serviço > Gerar nova chave privada.
// NUNCA commits esse ficheiro — já está no .gitignore (serviceAccountKey*.json).

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Uso: node scripts/seed-firestore.mjs <caminho-para-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const now = Timestamp.now();

async function seed() {
  await db.collection('clients').doc('client-example').set({
    name: 'Fábio Pombinho',
    email: 'exemplo@marblestudios.pt',
    phone: '',
    clientSince: Timestamp.fromDate(new Date('2026-03-01')),
    notificationPrefs: { automotive: true, epoxy: true, graphic: false },
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('vehicles').doc('vehicle-example').set({
    clientId: 'client-example',
    type: 'car',
    name: 'BMW M4 — PPF Colorido',
    model: 'BMW M4',
    checkupStatus: 'pending',
    photoUrl: '',
    createdAt: now,
  });

  await db.collection('works').doc('work-example').set({
    title: 'Jaguar F-Type — Vinil Roxo Metálico',
    category: 'Automotive',
    clientId: 'client-example',
    vehicleId: 'vehicle-example',
    model: 'Jaguar F-Type R',
    description:
      'Wrap completo em vinil roxo metálico com acabamento gloss, jantes forjadas em dourado e interior em couro teal personalizado.',
    photoUrl: '',
    products: [
      { brand: 'Inozetek', item: 'Vinil Roxo Metálico Gloss' },
      { brand: 'Xtreme Polishing Systems', item: 'Detailing final' },
    ],
    featured: true,
    published: true,
    completedAt: Timestamp.fromDate(new Date('2026-08-30')),
    createdAt: now,
  });

  await db.collection('events').doc('event-example').set({
    title: 'Auto Expo Lisboa 2026',
    location: 'FIL — Parque das Nações, Lisboa',
    date: Timestamp.fromDate(new Date('2026-09-15')),
    photoUrl: '',
    createdAt: now,
  });

  await db.collection('notifications').doc('notification-example').set({
    clientId: 'client-example',
    type: 'checkup_reminder',
    title: 'Checkup pendente',
    description: 'O teu PPF (BMW M4) está pronto para o checkup gratuito. Confirma antes que a equipa te ligue.',
    read: true,
    relatedVehicleId: 'vehicle-example',
    createdAt: now,
  });

  console.log('Seed concluído: clients, vehicles, works, events, notifications.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
