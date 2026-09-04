#!/usr/bin/env node
// Popula um projeto Firebase Marble Studios com dados de exemplo realistas
// em todas as coleções (clients, vehicles, works, events, notifications).
// Idempotente: usa IDs fixos, por isso correr duas vezes só sobrescreve.
//
// Uso:
//   node scripts/seed-firestore.mjs ./serviceAccountKey.dev.json
//   node scripts/seed-firestore.mjs ./serviceAccountKey.dev.json --client outro@email.pt
//
// Carros/chãos e alertas ficam ligados à conta de teste (por defeito
// teste.seccao2@example.com, criada na Secção 2) para se verem no Perfil e
// nos Alertas depois de fazer login na app. O doc `clients/{uid}` dessa conta
// NÃO é tocado — já tem consentimento real gravado pela app.
//
// A chave de service account descarrega-se em:
// Firebase Console > [projeto] > Definições do projeto (engrenagem) >
// Contas de serviço > Gerar nova chave privada.
// NUNCA commits esse ficheiro — já está no .gitignore (serviceAccountKey*.json).
//
// Não corras isto contra o prod (fica vazio até ao lançamento — Secção 11).

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const keyPath = args.find((a) => !a.startsWith('--'));
const clientFlag = args.indexOf('--client');
const TEST_EMAIL = clientFlag >= 0 ? args[clientFlag + 1] : 'teste.seccao2@example.com';

if (!keyPath) {
  console.error('Uso: node scripts/seed-firestore.mjs <caminho-para-service-account.json> [--client email]');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
if (String(serviceAccount.project_id).includes('prod')) {
  console.error(`Recusado: a chave é do projeto ${serviceAccount.project_id}. O prod fica vazio até ao lançamento.`);
  process.exit(1);
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const now = Timestamp.now();
const day = (n) => Timestamp.fromDate(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
const hour = (n) => Timestamp.fromDate(new Date(Date.now() - n * 60 * 60 * 1000));
const on = (iso) => Timestamp.fromDate(new Date(iso));

// Fotos: a app mostra qualquer URL público que fique em `photoUrl` e cai num
// gradiente dourado quando está vazio (ver src/components/Photo.tsx). O
// alojamento é o Cloudinary (Secção 5); a equipa carrega as fotos no
// backoffice. A do Jaguar já lá está (carregada em 2026-09-04 pelo preset
// marble-works) — o URL segue o formato que o backoffice gera
// (marble-backoffice/src/media/cloudinary.ts). As outras ficam vazias até
// a equipa as carregar.
const CLOUDINARY = 'https://res.cloudinary.com/kr9bmaqh/image/upload';
const JAGUAR_ID = 'b6eeuwb2ekpdxxxttnqy';
const JAGUAR_PHOTO = `${CLOUDINARY}/c_limit,w_1600,q_auto,f_auto/${JAGUAR_ID}`;
const JAGUAR_MEDIA = [
  {
    type: 'photo',
    url: JAGUAR_PHOTO,
    thumbnailUrl: `${CLOUDINARY}/c_fill,w_480,h_360,q_auto,f_auto/${JAGUAR_ID}`,
    order: 0,
    publicId: JAGUAR_ID,
  },
];

async function resolveTestClient() {
  try {
    const user = await getAuth().getUserByEmail(TEST_EMAIL);
    console.log(`Conta de teste: ${TEST_EMAIL} → uid ${user.uid}`);
    return user.uid;
  } catch (err) {
    console.warn(
      `Aviso: não há utilizador Auth com o email ${TEST_EMAIL} (${err.code}). ` +
        'Carros e alertas ficam ligados a `client-example`, que ninguém consegue ver na app. ' +
        'Cria a conta na app (Perfil > Criar conta) e volta a correr o seed.'
    );
    return 'client-example';
  }
}

async function seed() {
  const clientId = await resolveTestClient();
  const batch = db.batch();

  // --- clients: um cliente de exemplo sem conta Auth (serve para o backoffice
  // ter algo para listar). O doc da conta de teste fica como a app o deixou.
  batch.set(db.collection('clients').doc('client-example'), {
    name: 'Fábio Pombinho',
    email: 'exemplo@marblestudios.pt',
    phone: '',
    // Ficha criada pela equipa, sem conta na app (Secção 5): o backoffice
    // marca-a assim e sabe que não lhe pode enviar alertas.
    createdByTeam: true,
    clientSince: on('2026-03-01'),
    notificationPrefs: { automotive: true, epoxy: true, graphic: false },
    consent: {
      termsVersion: '2026-09-03',
      termsAcceptedAt: now,
      marketing: false,
      marketingUpdatedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  });

  // --- vehicles: um carro com checkup pendente e um chão em dia.
  const vehicles = {
    'vehicle-example': {
      clientId,
      type: 'car',
      name: 'BMW M4 — PPF Colorido',
      model: 'BMW M4 Competition',
      lastServiceAt: on('2026-08-25'),
      checkupStatus: 'pending',
      photoUrl: '',
      createdAt: on('2026-08-25'),
    },
    'vehicle-showroom-floor': {
      clientId,
      type: 'floor',
      name: 'Showroom — Metallic Epoxy',
      model: 'Showroom · 180 m²',
      lastServiceAt: on('2026-06-12'),
      checkupStatus: 'ok',
      photoUrl: '',
      createdAt: on('2026-06-12'),
    },
  };
  for (const [id, data] of Object.entries(vehicles)) batch.set(db.collection('vehicles').doc(id), data);

  // --- works: 7 publicados nas 3 categorias (3 em destaque no carrossel, com
  // `featuredOrder` — a app ordena o carrossel por ele) + 1 rascunho que NÃO
  // pode aparecer na app (testa as regras).
  const works = {
    'work-example': {
      title: 'Jaguar F-Type — Vinil Roxo Metálico',
      category: 'Automotive',
      model: 'Jaguar F-Type R',
      description:
        'Wrap completo em vinil roxo metálico com acabamento gloss, jantes forjadas em dourado e interior em couro teal personalizado. Um dos trabalhos mais marcantes do nosso portfólio Automotive Aesthetics.',
      products: [
        { brand: 'Inozetek', item: 'Vinil Roxo Metálico Gloss' },
        { brand: 'Xtreme Polishing Systems', item: 'Detailing final' },
      ],
      photoUrl: JAGUAR_PHOTO,
      media: JAGUAR_MEDIA,
      featured: true,
      featuredOrder: 0,
      published: true,
      completedAt: on('2026-08-30'),
    },
    'work-showroom-epoxy': {
      title: 'Metallic Epoxy — Showroom Premium',
      category: 'Epoxy Floors',
      clientId,
      vehicleId: 'vehicle-showroom-floor',
      model: 'Showroom · Porto',
      description:
        'Aplicação de sistema epóxi metálico em piso de showroom automóvel, com acabamento brilhante e efeito tridimensional. Resistente a químicos e abrasão, pensado para uso comercial intensivo.',
      products: [
        { brand: 'Xtreme Polishing Systems', item: 'Metallic Pigment Gold' },
        { brand: 'Xtreme Polishing Systems', item: 'Topcoat UV' },
      ],
      featured: true,
      featuredOrder: 1,
      published: true,
      completedAt: on('2026-08-29'),
    },
    'work-bmw-ppf': {
      title: 'PPF Colorido — BMW M4',
      category: 'Automotive',
      clientId,
      vehicleId: 'vehicle-example',
      model: 'BMW M4 Competition',
      description:
        'Película de proteção colorida em toda a carroçaria, com corte por molde para não haver emendas visíveis. Protege contra riscos e gravilha mantendo o brilho original.',
      products: [{ brand: 'Inozetek', item: 'PPF Colorido Gloss' }],
      featured: false,
      published: true,
      completedAt: on('2026-08-25'),
    },
    'work-fleet-rebrand': {
      title: 'Rebranding de frota',
      category: 'Graphic',
      model: 'Frota de 12 viaturas comerciais',
      description:
        'Nova identidade visual aplicada em 12 viaturas: design, impressão e aplicação de vinil. Cores e tipografia alinhadas com o novo logótipo da empresa cliente.',
      products: [{ brand: 'Avery Dennison', item: 'Vinil de impressão MPI 1105' }],
      featured: true,
      featuredOrder: 2,
      published: true,
      completedAt: on('2026-08-24'),
    },
    'work-audi-matte': {
      title: 'Vinil Fosco — Audi RS3',
      category: 'Automotive',
      model: 'Audi RS3 Sportback',
      description: 'Wrap completo em vinil cinza fosco com detalhes em preto brilhante nas jantes e nas grelhas.',
      products: [{ brand: 'Inozetek', item: 'Vinil Cinza Fosco' }],
      featured: false,
      published: true,
      completedAt: on('2026-08-22'),
    },
    'work-warehouse-flake': {
      title: 'Flake System — Armazém',
      category: 'Epoxy Floors',
      model: 'Armazém logístico · 600 m²',
      description:
        'Piso epóxi com sistema de flocos decorativos e camada de desgaste em poliaspártico, pensado para tráfego de empilhadores.',
      products: [{ brand: 'Xtreme Polishing Systems', item: 'Flake System Granite' }],
      featured: false,
      published: true,
      completedAt: on('2026-08-15'),
    },
    'work-porsche-detail': {
      title: 'Detailing completo — Porsche 911',
      category: 'Automotive',
      model: 'Porsche 911 Carrera S',
      description: 'Correção de pintura em duas fases, proteção cerâmica e tratamento completo do interior em pele.',
      products: [{ brand: 'Xtreme Polishing Systems', item: 'Ceramic Coating 9H' }],
      featured: false,
      published: true,
      completedAt: on('2026-08-10'),
    },
    'work-draft-tesla': {
      title: 'PPF Transparente — Tesla Model 3 (RASCUNHO)',
      category: 'Automotive',
      model: 'Tesla Model 3',
      description: 'Ainda não publicado — não pode aparecer na app.',
      products: [],
      featured: true,
      featuredOrder: 3,
      published: false,
      completedAt: on('2026-09-02'),
    },
  };
  for (const [id, data] of Object.entries(works)) {
    batch.set(db.collection('works').doc(id), { photoUrl: '', createdAt: now, ...data });
  }

  // --- events: dois futuros e um passado (o filtro Próximos/Passados precisa
  // de ambos). O "Car & Coffee" é daqui a poucos dias de propósito.
  const events = {
    'event-example': {
      title: 'Auto Expo Lisboa 2026',
      location: 'FIL — Parque das Nações, Lisboa',
      date: on('2026-09-15T10:00:00'),
    },
    'event-car-coffee-aveiro': {
      title: 'Car & Coffee Aveiro',
      location: 'Rossio, Aveiro',
      date: on('2026-09-05T09:30:00'),
    },
    'event-open-day': {
      title: 'Open Day — Novo Espaço',
      location: 'Marble Studios HQ, Paio Pires',
      date: on('2026-08-10T15:00:00'),
    },
  };
  for (const [id, data] of Object.entries(events)) {
    batch.set(db.collection('events').doc(id), { photoUrl: '', createdAt: now, ...data });
  }

  // --- notifications: os 4 tipos que o cliente vê. Dois por ler.
  const notifications = {
    'notification-example': {
      clientId,
      type: 'checkup_reminder',
      title: 'Checkup pendente',
      description: 'O teu PPF (BMW M4) está pronto para o checkup gratuito. Confirma antes que a equipa te ligue.',
      read: false,
      relatedVehicleId: 'vehicle-example',
      createdAt: hour(2),
    },
    'notification-new-work': {
      clientId,
      type: 'new_work',
      title: 'Novo trabalho publicado',
      description: 'Acabámos de publicar um novo Metallic Epoxy no portfólio — vai espreitar.',
      read: false,
      relatedWorkId: 'work-showroom-epoxy',
      createdAt: day(1),
    },
    'notification-offer': {
      clientId,
      type: 'offer',
      title: 'Lavagem grátis disponível',
      description: 'O teu BMW M4 já passou um mês do checkup — tens uma lavagem grátis à espera.',
      read: true,
      relatedVehicleId: 'vehicle-example',
      createdAt: day(3),
    },
    'notification-event': {
      clientId,
      type: 'event_reminder',
      title: 'Auto Expo Lisboa 2026',
      description: 'É já a 15 de Setembro. Vemo-nos lá?',
      read: true,
      relatedEventId: 'event-example',
      createdAt: day(5),
    },
  };
  for (const [id, data] of Object.entries(notifications)) {
    batch.set(db.collection('notifications').doc(id), { photoUrl: '', ...data });
  }

  // --- requests: dois pedidos de orçamento (Secção 7) da conta de teste,
  // um por responder e um fechado. `processedAt` já preenchido para a Cloud
  // Function não criar alertas/emails ao semear.
  const requests = {
    'request-example-new': {
      type: 'quote',
      status: 'new',
      clientId,
      name: 'Cliente de Teste',
      email: TEST_EMAIL,
      phone: '912 345 678',
      contactPreference: 'whatsapp',
      department: 'automotive',
      workId: 'work-example',
      workTitle: 'Jaguar F-Type — PPF Colorido',
      services: ['PPF', 'Detailing'],
      fields: [{ key: 'car', label: 'Carro', value: 'Porsche 911 Carrera 2021' }],
      message: 'Gostava de proteger a frente toda com PPF e fazer um detail completo. Tenho disponibilidade a partir da próxima semana.',
      platform: 'android',
      processedAt: hour(3),
      createdAt: hour(3),
      updatedAt: hour(3),
    },
    'request-example-closed': {
      type: 'quote',
      status: 'closed',
      clientId,
      name: 'Cliente de Teste',
      email: TEST_EMAIL,
      phone: '912 345 678',
      contactPreference: 'call',
      department: 'epoxy',
      services: ['Metallic epoxy'],
      fields: [
        { key: 'space', label: 'Espaço', value: 'Garagem' },
        { key: 'area', label: 'Área aproximada (m²)', value: '40' },
      ],
      message: 'Garagem de 40 m², chão em betão, quero um acabamento metálico escuro.',
      notes: 'Orçamento enviado por WhatsApp (1 850 €). Aceite; marcado para outubro.',
      platform: 'ios',
      processedAt: day(20),
      contactedAt: day(19),
      closedAt: day(12),
      createdAt: day(20),
      updatedAt: day(12),
    },
  };
  for (const [id, data] of Object.entries(requests)) {
    batch.set(db.collection('requests').doc(id), data);
  }

  // --- settings/home: fotos dos cartões de departamento do Início (Secção
  // 5b). Só o Automotive leva foto (o Jaguar); os outros ficam no gradiente
  // até a equipa escolher no backoffice (Destaques > Fotos dos serviços).
  // `merge` para não apagar as fotos que a equipa já tenha escolhido.
  batch.set(
    db.collection('settings').doc('home'),
    {
      departmentCovers: {
        automotive: { photoUrl: JAGUAR_PHOTO, thumbnailUrl: JAGUAR_MEDIA[0].thumbnailUrl, publicId: JAGUAR_ID },
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
  console.log(
    `Seed concluído: 1 client de exemplo, ${Object.keys(vehicles).length} vehicles, ` +
      `${Object.keys(works).length} works (1 rascunho), ${Object.keys(events).length} events, ` +
      `${Object.keys(notifications).length} notifications, ${Object.keys(requests).length} requests → cliente ${clientId}; settings/home com a foto do Automotive.`
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
