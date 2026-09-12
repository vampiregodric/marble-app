# Auditoria 2026-09-12 — rgpd

> **Isto é um levantamento técnico, não um parecer jurídico.** Confronta o que
> o código faz com os dados pessoais com o que a política de privacidade, os
> termos e as fichas das lojas prometem. Serve para o Fábio e para um
> advogado decidirem; não substitui a revisão jurídica que o `ROADMAP.md`
> (Secção 3 — Conformidade RGPD, "Fica para depois") já dá como pendente.

App commit: `691938a` · Backoffice commit: `1c532f2` · Modo: completo · Só leitura.

## Âmbito

Lidos na íntegra (28 ficheiros):

- **Modelo e regras:** `src/firebase/models.ts`, `functions/src/types.ts`,
  `firestore.rules`.
- **Textos legais e lojas:** `src/legal/texts.ts`, `docs/legal/*.html` (3),
  `docs/store/data-safety.md`, `docs/store/app-privacy.md`,
  `docs/store/ficha-loja.md`, `docs/store/checklist-contas.md`.
- **Cloud Functions:** `index.ts`, `handlers.ts`, `requests.ts`,
  `simulations.ts`, `vertex.ts`, `email.ts`, `notify.ts`, `push.ts`,
  `expo.ts`, `consent.ts`, `cloudinary.ts`, `texts.ts`,
  `jobs/{index,retention,followUps,events,receipts}.ts`,
  `scripts/runJobs.ts`, `functions/.env`, `functions/.env.marble-studios-prod`.
- **App:** `AuthContext.tsx`, `DeleteAccountScreen.tsx`,
  `PersonalDataScreen.tsx`, `LegalScreen.tsx`, `SimulatorScreen.tsx`,
  `RequestQuoteScreen.tsx`, `src/push/push.native.ts`,
  `src/media/cloudinary.ts`, `src/i18n/{pt,en}.ts` (blocos relevantes),
  `.env`, `.env.production`.
- **Backoffice:** `data/duplicates.ts`, `data/writes.ts`,
  `pages/{ClientDetailPage,SimulationsPage}.tsx`, `README.md`.
- **Contexto:** `CLAUDE.md`, `SPEC.md`, `ROADMAP.md` (Secções 3, 11, 16),
  `DEVELOPMENT.md` ("RGPD (Secção 3)", "Notificações push e Cloud
  Functions", "Simulador", "Lançamento nas lojas").
- **Scripts:** `scripts/demo-account.mjs`, e varrimento de `console.log` em
  todos os `scripts/*.mjs`.

Ficou de fora: `ProfileScreen.tsx`, `NotificationsOnboardingScreen.tsx`,
`RequestDetailPage.tsx` e `SendAlertModal.tsx` lidos só por `grep` dirigido
(consentimento, marketing, dados mostrados) — o que se verificou está
registado; leitura integral não acrescentaria achados desta vertente.

Comandos corridos (todos só de leitura):

| Comando | Resultado em uma linha |
|---|---|
| `git remote -v`, `git rev-parse --short HEAD` (app e backoffice) | app `691938a` em `github.com/vampiregodric/marble-app`; backoffice `1c532f2`. |
| `git ls-files docs/store/` | `ficha-loja.md` e `checklist-contas.md` estão versionados (relevante para RGPD-15). |
| `grep -n "console.log" scripts/*.mjs` | 5 scripts imprimem email/nome de clientes no terminal. |
| `grep -rn "team_alert" src/` | o filtro dos alertas internos é só na app (`src/data/notifications.ts:24`), não nas regras. |
| `grep -rn "simulatorVersion" src/ functions/ ../marble-backoffice/src` | escrito só pela app; nunca lido pelas regras nem pelas Functions. |
| `grep -n "CLOUDINARY" .env .env.production` | dev e prod partilham o mesmo cloud `kr9bmaqh`; `.env.production` não tem o preset das simulações. |

## Contagem

| Severidade | Achados |
|---|---|
| Crítico | 1 |
| Alto | 4 |
| Médio | 10 |
| Baixo | 3 |
| Sugestão | 2 |

## Inventário de dados pessoais

Base: `src/firebase/models.ts` e `functions/src/types.ts`. "Equipa" = conta
com o claim `admin: true` (backoffice). Retenção = o que está **implementado**
em código, não o que a política promete (a comparação está na secção seguinte).

### `clients/{uid}` — a ficha do cliente

| Campo | Categoria | Quem introduz | Finalidade | Base legal provável | Quem lê | Para onde vai | Retenção implementada |
|---|---|---|---|---|---|---|---|
| `name` | identificação | cliente (registo/pedido) ou equipa | tratar pelo nome, ficha | contrato | próprio, equipa | Resend (email), Expo (texto do push com o 1.º nome), Cloud Logging | limpo em "Apagar conta" e no job de retenção (3 anos) |
| `email` | contacto | cliente (Auth) ou equipa | login, emails | contrato | próprio, equipa | Resend, Cloud Logging | idem |
| `phone` | contacto | cliente ou equipa | a equipa liga para checkups | contrato | próprio, equipa | Resend (email à equipa), Cloud Logging | idem |
| `locale` | técnico | app (idioma do telemóvel) | idioma dos alertas automáticos | interesse legítimo | próprio, equipa, Functions | — | **não limpo** ao apagar conta |
| `avatarUrl` | imagem | cliente | foto de perfil | consentimento | próprio, equipa | Cloudinary | campo limpo; ficheiro apagado pela `onClientUpdated` (prod: `CLOUDINARY_CLEANUP=on`) |
| `notes` | notas internas | equipa | acompanhamento comercial | interesse legítimo | próprio (pelas regras!), equipa | — | limpo **só** no job de retenção, não no "Apagar conta" da app (RGPD-08) |
| `notificationPrefs` | consentimento | cliente | categorias de marketing | consentimento | próprio, equipa, Functions | — | posto a false ao apagar |
| `consent.termsVersion/AcceptedAt` | consentimento | cliente | prova de aceitação | obrigação (art. 7.º n.º 1) | próprio, equipa | — | mantido de propósito |
| `consent.marketing/marketingUpdatedAt` | consentimento | cliente | opt-in de ofertas | consentimento | próprio, equipa, Functions | — | posto a false ao apagar |
| `consent.simulatorVersion/AcceptedAt` | consentimento | cliente | uso da foto no simulador | consentimento | próprio, equipa | — | **nunca limpo** (RGPD-17) |
| `pushTokens[]` | técnico/dispositivo | app | entregar push | contrato/consentimento | próprio, equipa, Functions | **Expo (EUA)** | removido ao sair, ao apagar conta e quando o Expo diz `DeviceNotRegistered` |
| `lastActiveAt` | comportamento | app (1×/dia) | regra dos 3 anos de inatividade | interesse legítimo | próprio, equipa, Functions | — | fica até a conta ser anonimizada |
| `retentionWarnedAt`, `onboardingSeenAt` | técnico | Functions / app | estado dos fluxos | interesse legítimo | próprio, equipa | — | fica |
| `createdByTeam`, `mergedInto`, `deletedAt` | técnico | equipa / sistema | distinguir fichas e contas | interesse legítimo | próprio, equipa | — | fica (é o registo da anonimização) |

### `vehicles/{id}` — carros e chãos

| Campo | Categoria | Quem introduz | Finalidade | Base legal | Quem lê | Retenção implementada |
|---|---|---|---|---|---|---|
| `clientId` | identificação (pseudónimo) | equipa | ligar ao cliente | contrato | dono, equipa | fica |
| `name`, `model`, `photoUrl` | veículo/imagem | equipa | ficha do serviço | contrato | dono, equipa | fica |
| `plate` | **matrícula** | equipa | identificar o carro no serviço | contrato | equipa (a app não a mostra); **dono, pelas regras** | **nunca apagada** (RGPD-03) |
| `checkupStatus`, `checkupDoneAt`, `checkupRequestedAt` | comportamento | equipa/Functions | acompanhamento | contrato | dono, equipa | fica |
| `checkupRequest.{day,period,note,teamNote,time}` | comportamento/texto livre | cliente + equipa | agendar o checkup | contrato | dono, equipa | fica (histórico) |

### `works/{id}` — portfólio

| Campo | Categoria | Quem introduz | Finalidade | Base legal | Quem lê | Retenção |
|---|---|---|---|---|---|---|
| `clientId`, `vehicleId` | identificação (pseudónimo) | equipa | ligar o trabalho ao dono | contrato | **qualquer pessoa** se `published` (RGPD-05) | fica |
| `model`, `description`, `photoUrl`, `media[]` | veículo/imagem | equipa | portfólio | interesse legítimo + termos §5 | público se `published` | fica |
| `followUp.*` (`offerSkipped: 'no_consent'`) | consentimento/comportamento | Functions | acompanhamento | contrato | **público se `published`** (RGPD-05) | fica |

### `notifications/{id}` — alertas

| Campo | Categoria | Quem introduz | Finalidade | Base legal | Quem lê | Para onde vai | Retenção |
|---|---|---|---|---|---|---|---|
| `clientId` | pseudónimo | Functions/equipa | destinatário | contrato/consentimento | dono, equipa | — | **nunca apagada** |
| `title`, `description` (cliente) | contacto (1.º nome) | Functions/equipa | o alerta | contrato/consentimento | dono, equipa | **Expo (EUA)** | **nunca apagada** |
| `title`, `description` (`team_alert`) | **nome + telemóvel + nota do cliente** | Functions | a equipa ligar | interesse legítimo | equipa **e o próprio** (regras) | nunca vai a push | **nunca apagada — sobrevive ao "Apagar conta"** (RGPD-02) |
| `push.tickets[]`, `push.receiptError` | técnico | Functions | recibos do Expo | contrato | dono, equipa | Expo | fica |

### `requests/{id}` — pedidos de orçamento

| Campo | Categoria | Quem introduz | Finalidade | Base legal | Quem lê | Para onde vai | Retenção |
|---|---|---|---|---|---|---|---|
| `name`, `email`, `phone`, `contactPreference` | contacto | cliente | responder ao pedido | diligências pré-contratuais | dono, equipa | **Resend (email à equipa e ao cliente)**, Cloud Logging | anonimizado 365 dias depois de `closedAt`, ou ao apagar a conta |
| `services[]`, `fields[]`, `message` | texto livre | cliente | o pedido | pré-contratual | dono, equipa | Resend | idem (`fields: []`, `message: ''`) |
| `photos[]` | imagem | cliente | ver o carro/espaço | pré-contratual | dono, equipa | **Cloudinary**; os URL vão no email do Resend | apagadas do Firestore e do Cloudinary (tag `request_<id>`) na anonimização |
| `simulation` | imagem | cliente | anexar a simulação | consentimento | dono, equipa | Cloudinary, Resend | apagada na anonimização (`deleteRequestSimulations`) |
| `notes` (equipa) | notas internas | equipa | seguimento | interesse legítimo | equipa | — | apagadas na anonimização |
| `platform`, `flagged` | técnico | app/Functions | suporte e anti-spam | interesse legítimo | equipa | — | fica |

### `simulations/{id}` — simulador "como ficaria"

| Campo | Categoria | Quem introduz | Finalidade | Base legal | Quem lê | Para onde vai | Retenção |
|---|---|---|---|---|---|---|---|
| `photo` (foto do chão/carro do cliente) | **imagem** (interior de casa, garagem, carro com matrícula) | cliente | gerar a simulação | consentimento | dono, **toda a equipa** (decisão do Fábio, 2026-09-09) | **Cloudinary** e **Vertex AI, endpoint `global`** (RGPD-01) | doc apagado 90 dias depois se não tiver `requestId`; ficheiros pela tag `simulation_<id>` |
| `result` | imagem gerada | Function | mostrar ao cliente | consentimento | dono, equipa | Cloudinary | idem |
| `source`, `kind`, `status`, `model`, `durationMs`, `error` | técnico | app/Function | o simulador | consentimento | dono, equipa | — | idem |
| `clientId`, `requestId`, `platform` | pseudónimo/técnico | app | ligações | consentimento | dono, equipa | — | idem |

### Fora do Firestore

| Onde | Dados | Retenção implementada |
|---|---|---|
| **Firebase Auth** | email, hash da password, **IP e user-agent** de cada sessão | utilizador apagado em "Apagar conta" e na retenção; o IP/user-agent é da Google (não declarado na política — RGPD-16) |
| **Cloudinary** (`kr9bmaqh`, partilhado dev+prod) | fotos de perfil, fotos dos pedidos, fotos e resultados do simulador, fotos dos trabalhos | apagadas por tag pelas Functions **só com `CLOUDINARY_CLEANUP=on`** — ligado no prod, **desligado no dev** (RGPD-14) |
| **Expo Push (EUA)** | token do dispositivo, título e corpo do alerta (com o 1.º nome) | do Expo |
| **Resend (EUA/Irlanda)** | nome, email, telemóvel, texto do pedido, URL das fotos e da simulação | do Resend |
| **Google Cloud Logging** (`europe-west1`) | emails, nomes e telemóveis impressos pelos jobs e triggers | 30 dias por omissão; não declarado (RGPD-06) |
| **Vertex AI** (endpoint `global`) | a foto do cliente + a amostra, em base64 | não retida pela Google segundo os termos de tratamento; **local de processamento não declarado** (RGPD-01) |
| **Terminal / conversas do Claude** | emails e nomes impressos por `scripts/*.mjs` e `runJobs.ts` | nenhuma (RGPD-06) |

## Promessa vs código

| # | Promessa (onde) | O que o código faz | Veredito |
|---|---|---|---|
| 1 | Subcontratantes: Firebase, Vertex AI, Expo, Cloudinary, Resend (`texts.ts:134-138`) | todos os cinco estão no código e todos estão nomeados com finalidade | **cumpre** |
| 2 | Firestore na UE (`eur3`), Functions em `europe-west1` (`texts.ts:134`) | `setGlobalOptions({ region: 'europe-west1' })` (`index.ts:31`) | **cumpre** |
| 3 | Cloudinary, Expo e Resend podem processar fora da UE, com cláusulas-tipo (`texts.ts:136-138`) | é o que acontece | **cumpre** |
| 4 | Vertex AI "no mesmo projeto Google Cloud da base de dados" (`texts.ts:135`) | `VERTEX_LOCATION=global` → `aiplatform.googleapis.com`, processamento fora da UE, reconhecido em `DEVELOPMENT.md:1025` e `ROADMAP.md:1545` | **não cumpre — RGPD-01** |
| 5 | Foto de perfil sai do alojamento em ≤ 30 dias (`texts.ts:148`) | `onClientUpdated` apaga por tag em segundos (prod `CLOUDINARY_CLEANUP=on`) | **cumpre (melhor)** |
| 6 | Contas inativas há 3 anos apagadas (`texts.ts:149`) | `jobs/retention.ts`, `INACTIVE_YEARS=3`, aviso 30 dias antes | **cumpre** |
| 7 | Pedidos sem dados pessoais 12 meses depois de fechados (`texts.ts:150`) | `runRequestRetention`, `REQUEST_RETENTION_DAYS=365`, a partir de `closedAt` | **cumpre** |
| 8 | Simulações apagadas aos 90 dias sem pedido (`texts.ts:151`) | `runSimulationRetention`, `SIMULATION_RETENTION_DAYS=90` | **cumpre** |
| 9 | "Apagar a conta remove nome, email, telemóvel e foto de perfil de imediato" (`texts.ts:147`) | `AuthContext.deleteAccount` faz isso no doc `clients` | **cumpre no doc do cliente** |
| 10 | "O histórico fica **sem qualquer ligação a ti**" (`texts.ts:147`, `apagar-conta.html`) | ficam: a **matrícula** em `vehicles.plate`, o **nome e telemóvel** no texto dos `team_alert`, e as **notas internas** `clients.notes` | **não cumpre — RGPD-02, RGPD-03, RGPD-08** |
| 11 | "Apagar a conta apaga também os dados pessoais dos teus pedidos" e "todas as tuas simulações" (`texts.ts:150-151`) | `handleClientUpdated` chama `anonymizeClientRequests` + `deleteClientSimulations` | **cumpre** |
| 12 | Marketing só com opt-in; operacional vai sempre (`texts.ts:114,124`) | `consent.ts:canReceive` nas Functions, revalidado em `push.ts:40`, e a mesma regra no backoffice (`writes.ts:234`) | **cumpre, em profundidade** |
| 13 | Consentimento do simulador numa caixa não pré-marcada (`texts.ts:116`) | `SimulatorScreen.tsx:151,276` — mas nem `firestore.rules` nem a Function o verificam | **cumpre na app, não no servidor — RGPD-07** |
| 14 | Retirar o consentimento do simulador "apagando as simulações" (`texts.ts:162`) | apagar simulações não toca em `consent.simulatorVersion`; a pergunta nunca volta | **não cumpre — RGPD-17** |
| 15 | Nova versão dos textos → a app pede nova aceitação (`texts.ts:183`) | `needsTermsAcceptance` + cartão no Perfil; o simulador volta a pedir por `simulatorVersion !== LEGAL_VERSION` | **cumpre** |
| 16 | Idade mínima 18 (`texts.ts:172`, termos §2) | nenhuma verificação de idade em lado nenhum | **declarado, não verificável** (é o normal a esta escala; não é achado) |
| 17 | Direitos de acesso/portabilidade por email, resposta em 1 mês (`texts.ts:167`) | não há ecrã, exportação no backoffice nem procedimento escrito além de "à mão" (`DEVELOPMENT.md:196`) | **cumpre no papel, sem ferramenta — RGPD-10** |
| 18 | "Só tu, com a tua sessão, consegues ler os teus dados" (`texts.ts:177`) | verdade no Firestore; **falso no Cloudinary** (URL de entrega público não assinado) | **parcial — RGPD-13** |
| 19 | "A equipa acede… através de ferramentas internas com credenciais próprias" (`texts.ts:177`) | um único claim `admin: true`, sem níveis nem registo de acessos | **cumpre à letra** (ver Sugestão RGPD-19) |
| 20 | Termos §5: fotos publicadas "sem identificar o proprietário" | o doc `works` publicado leva `clientId` e `vehicleId` legíveis por qualquer pessoa | **enfraquecido — RGPD-05** |
| 21 | Política §2: não se declaram `notes`, `lastActiveAt`, `locale`, `platform`, IP/user-agent do Auth | todos existem e são recolhidos | **incompleto — RGPD-16** |
| 22 | Fichas das lojas derivadas da política (`data-safety.md:5`, `app-privacy.md:5`) | derivadas da versão **2026-09-05**; a atual é **2026-09-09** (simulador) | **desatualizadas — RGPD-04** |
| 23 | Política §2/§5 e termos §1/§5 descrevem o simulador | `.env.production` não tem `EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS` → o simulador não aparece nas builds de produção | **a política vai à frente do produto — RGPD-18** |

## Achados

### RGPD-01 — A foto do cliente vai para fora da UE pelo endpoint `global` do Vertex AI, e a política não o diz
- **Vertente:** rgpd
- **Severidade:** Crítico
- **Superfície:** functions
- **Onde:** `functions/.env:46`, `functions/src/index.ts:64`, `functions/src/vertex.ts:45`, `src/legal/texts.ts:135`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o simulador envia a fotografia do chão, da garagem ou do carro do cliente para o endpoint `global` do Vertex AI, que — como o próprio `DEVELOPMENT.md` admite — processa fora da União Europeia. A política de privacidade descreve o Vertex AI como estando "no mesmo projeto Google Cloud da base de dados" e é a **única** das cinco entradas de subcontratantes que não menciona transferência para fora da UE nem cláusulas contratuais-tipo — ao contrário do Firebase Auth, do Cloudinary, do Expo e do Resend, que a mencionam explicitamente.
- **Cenário de falha:** um cliente fotografa a sala de casa, aceita a caixa "Autorizo que a foto que escolhi seja usada para gerar a simulação, como descrito na Política de privacidade", e a foto é enviada para um datacentro da Google em qualquer região do mundo. Se pedir a informação do artigo 13.º n.º 1 f) (transferências para países terceiros e garantias aplicáveis), a política que ele aceitou não a tem. Já aconteceu com dados reais: o `ROADMAP.md` regista a primeira simulação real a 2026-09-10 (o Jaguar do Fábio) e ela ficou guardada no dev (`simulations/h9Hm36n5rIyBcXdI4ZNF`).
- **Evidência:**
  ```
  functions/.env:46      VERTEX_LOCATION=global
  functions/src/vertex.ts:45
    const host = cfg.location === 'global' ? 'aiplatform.googleapis.com' : `${cfg.location}-aiplatform.googleapis.com`;
  src/legal/texts.ts:135
    'Google Cloud Vertex AI (Google Ireland Ltd.): geração das simulações "como
     ficaria", no mesmo projeto Google Cloud da base de dados.'
  ```
  A decisão está documentada e reconhece a transferência — falta só na política:
  `DEVELOPMENT.md:1025` — "Endpoint `global` = processamento fora da UE ao abrigo do contrato da Google Cloud";
  `ROADMAP.md:1545` (Secção 16, "Em aberto") — "o endpoint `global` do Vertex processa fora da UE (o contrato de tratamento de dados da Google Cloud cobre; se o modelo passar a existir em `europe-west1`, muda `VERTEX_LOCATION`)".
- **Correção proposta:** duas hipóteses, e a escolha é do Fábio.
  1. **Fechar a UE** (preferível se o modelo existir lá): `VERTEX_LOCATION=europe-west1` em `functions/.env` e redeploy; se o modelo não existir, `VERTEX_IMAGE_MODEL` tem de mudar para um que exista. Depois a redação atual da política fica correta.
  2. **Declarar a transferência**, alinhando a redação com a do Cloudinary:
     ```ts
     // src/legal/texts.ts, secção 5
     'Google Cloud Vertex AI (Google Ireland Ltd.): geração das simulações "como ficaria", ' +
     'no mesmo projeto Google Cloud da base de dados. Recebe a fotografia que escolheres e a ' +
     'amostra, devolve a imagem gerada e não usa as tuas fotografias para treinar modelos. ' +
     'O processamento pode ocorrer em servidores fora da União Europeia, ao abrigo das ' +
     'cláusulas contratuais-tipo aprovadas pela Comissão Europeia e dos termos de tratamento ' +
     'de dados da Google Cloud.',
     ```
     Isto é alteração material → subir `LEGAL_VERSION`, correr `npm run build:legal`, publicar o Hosting (todos os clientes voltam a aceitar, e o simulador volta a pedir consentimento — é o comportamento certo).
- **Esforço:** S (opção 2) / M (opção 1, depende de o modelo existir em `europe-west1`)

---

### RGPD-02 — "Apagar conta" deixa o nome e o telemóvel do cliente no texto dos alertas internos
- **Vertente:** rgpd
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/texts.ts:124`, `functions/src/texts.ts:270-311`, `functions/src/handlers.ts:66-69`, `src/auth/AuthContext.tsx:285-297`, `functions/src/jobs/retention.ts:58-71`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os `team_alert` gravam o nome e o telemóvel do cliente **dentro do `title` e da `description`** do doc em `notifications`. Nem o "Apagar conta" da app, nem o job de retenção dos 3 anos, nem `handleClientUpdated` tocam na coleção `notifications`. Os pedidos e as simulações são tratados; os alertas não.
- **Cenário de falha:** um cliente pediu um checkup na app em 2026-03, a Function criou `notifications/xyz` com `title: "João Silva pediu checkup: BMW M4"` e `description: "… Telemóvel: 912 345 678."`. Em 2026-09 ele apaga a conta. O doc `clients/{uid}` fica vazio, mas `notifications/xyz` continua lá com o nome e o número, e a equipa continua a vê-lo no Painel e na página de Alertas do backoffice. O mesmo vale para o `requestTeamAlert`, que grava `nome · telemóvel` no texto.
- **Evidência:**
  ```ts
  // functions/src/texts.ts:123
  function phoneText(c: Client): string {
    return c.phone ? `Telemóvel: ${c.phone}.` : 'Sem telemóvel na ficha.';
  }
  // functions/src/texts.ts:310 (requestTeamAlert)
  description: `${r.name || 'Cliente'} · ${r.phone || 'sem telemóvel'} (…)`
  // functions/src/handlers.ts:66-69 — tudo o que a conta apagada dispara
  if (after.deletedAt && !before.deletedAt) {
    await anonymizeClientRequests(db, uid, new Date(), log);
    await deleteClientSimulations(db, uid, log);
  }
  ```
  Contra a promessa em `src/legal/texts.ts:147` ("O histórico de trabalhos fica guardado de forma anonimizada, ou seja, sem qualquer ligação a ti") e em `src/i18n/pt.ts:507` ("a equipa deixa de ter o teu contacto").
- **Correção proposta:** acrescentar a limpeza dos alertas ao mesmo sítio onde já se limpam os pedidos — `handleClientUpdated`, que serve os dois caminhos (app e retenção):
  ```ts
  // functions/src/handlers.ts
  export async function anonymizeClientNotifications(db: Firestore, clientId: string, log: Log): Promise<number> {
    const snap = await db.collection('notifications').where('clientId', '==', clientId).get();
    let n = 0;
    for (const d of snap.docs) {
      if (d.data().type !== 'team_alert') continue;   // os do cliente já não são legíveis (sem Auth)
      await d.ref.delete();                            // ou update({ title: 'Alerta de conta apagada', description: '' })
      n++;
    }
    if (n) log(`alertas internos de ${clientId}: ${n} apagado(s) (conta apagada)`);
    return n;
  }
  // e, em handleClientUpdated, a seguir a deleteClientSimulations:
  await anonymizeClientNotifications(db, uid, log);
  ```
  Decidir com o Fábio se se apaga o doc (perde-se o histórico operacional) ou se só se limpa o texto — apagar é mais limpo e o trabalho fica na mesma em `works`.
- **Esforço:** S

---

### RGPD-03 — A matrícula do carro sobrevive ao apagar a conta, contra a promessa de "sem qualquer ligação a ti"
- **Vertente:** rgpd
- **Severidade:** Alto
- **Superfície:** app, functions
- **Onde:** `src/firebase/models.ts:239`, `functions/src/handlers.ts:66-69`, `src/legal/texts.ts:147`, `../marble-backoffice/src/pages/ClientDetailPage.tsx:211`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `vehicles.plate` guarda a matrícula, que identifica o proprietário através dos registos automóveis — não é um pseudónimo. Nada a apaga: nem "Apagar conta", nem o job dos 3 anos, nem "Juntar fichas". A política diz que depois de apagar a conta o histórico fica "sem qualquer ligação a ti", e os termos §5 dizem que as fotos vão para o portfólio "com a matrícula ocultada" — o campo no Firestore é a ligação que ficou.
- **Cenário de falha:** cliente apaga a conta em 2026. Em 2029 alguém com acesso ao backoffice (ou uma sessão comprometida) abre a ficha do "cliente apagado" e vê `BMW M4 · 12-AB-34`; uma consulta ao registo automóvel devolve o nome que a app diz ter apagado. O `deletedAt` no doc `clients` dá a falsa garantia de que a anonimização está feita.
- **Evidência:**
  ```ts
  // src/firebase/models.ts:238-239
  // Matrícula (carros). Só a equipa vê; a app não a mostra.
  plate?: string;
  ```
  ```
  // src/legal/texts.ts:147
  'O histórico de trabalhos fica guardado de forma anonimizada, ou seja, sem
   qualquer ligação a ti, para efeitos de garantia, portfólio e estatística.'
  ```
  `functions/src/handlers.ts:66-69` (acima) não toca em `vehicles`; `jobs/retention.ts:58-71` também não.
- **Correção proposta:** limpar a matrícula no mesmo passo que limpa os pedidos, mantendo o resto do histórico:
  ```ts
  // functions/src/handlers.ts, dentro do bloco `after.deletedAt && !before.deletedAt`
  const vehicles = await db.collection('vehicles').where('clientId', '==', uid).get();
  for (const v of vehicles.docs) {
    if (!v.data().plate) continue;
    await v.ref.update({ plate: FieldValue.delete(), updatedAt: Timestamp.fromDate(new Date()) });
  }
  ```
  Se a equipa precisar da matrícula para garantias, então a promessa da política é que tem de mudar (dizer que a matrícula se conserva pelo prazo de garantia e porquê) — mas as duas coisas não podem ficar como estão.
- **Esforço:** S

---

### RGPD-04 — As fichas de privacidade das lojas não declaram as fotos do simulador
- **Vertente:** rgpd
- **Severidade:** Alto
- **Superfície:** hosting
- **Onde:** `docs/store/data-safety.md:5`, `docs/store/data-safety.md:63`, `docs/store/app-privacy.md:5`, `docs/store/app-privacy.md:51`, `src/legal/texts.ts:22`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os dois formulários dizem no cabeçalho que foram derivados da política **versão 2026-09-05**. A `LEGAL_VERSION` é **2026-09-09** — a versão que acrescentou o simulador. As linhas de "Fotos"/"Photos or Videos" listam só a foto de perfil e as até 5 fotos de um pedido de orçamento; falta a fotografia do chão/carro que o cliente carrega no simulador e a imagem gerada pela IA. Falta também o Vertex AI na lista de quem recebe dados.
- **Cenário de falha:** o Fábio copia estes ficheiros para a Play Console e para o App Store Connect (é o que a `checklist-contas.md:244` manda fazer). A app é aprovada com uma declaração que diz que só recolhe fotos para o perfil e para orçamentos, enquanto envia fotografias do interior da casa do cliente para um modelo de IA da Google. Uma reclamação ou uma revisão da Apple sobre "Data Use" bate na declaração errada — pior do que a rejeição, porque é aceite e fica errada.
- **Evidência:**
  ```
  docs/store/data-safety.md:4-5
    derivadas da Política de Privacidade (`src/legal/texts.ts`, versão 2026-09-05)
  docs/store/data-safety.md:63
    | Fotos | Sim — (1) a foto de perfil, se o cliente a escolher; (2) até 5 fotos
      que o cliente junte a um pedido de orçamento … |
  src/legal/texts.ts:22
    export const LEGAL_VERSION = '2026-09-09';
  ```
  O `ROADMAP.md:1007-1008` confirma que a última revisão destes ficheiros foi feita na Secção 11 (2026-09-06), antes da Secção 16.
- **Correção proposta:** rever os dois ficheiros contra a política 2026-09-09, no mínimo:
  - `data-safety.md`, linha "Fotos": acrescentar "(3) a fotografia do chão ou do carro que o cliente carrega no simulador 'como ficaria' e a imagem gerada a partir dela"; e no bloco de notas dizer que a imagem é gerada pelo Vertex AI da Google, que recebe a fotografia.
  - `app-privacy.md`, "Photos or Videos": o mesmo; manter "Linked to the user: Sim", "Tracking: Não", uso "App Functionality".
  - Actualizar o cabeçalho dos dois para "versão 2026-09-09" e acrescentar a nota do simulador ao lado das notas das Secções 12/13.
  - Rever o mesmo em `docs/store/ficha-loja.md` se a descrição da app mencionar (ou dever mencionar) o simulador.
- **Esforço:** S

---

### RGPD-05 — Qualquer pessoa lê o `clientId`, o carro e o estado de consentimento em cada trabalho publicado
- **Vertente:** rgpd
- **Severidade:** Alto
- **Superfície:** regras
- **Onde:** `firestore.rules:107`, `src/firebase/models.ts:395-424`, `../marble-backoffice/src/pages/WorkFormPage.tsx:219-220`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `works` é legível sem sessão quando `published == true`, e as regras devolvem o **documento inteiro**. Um doc de trabalho publicado leva `clientId` (o uid do Auth do dono), `vehicleId`, `model`, e todo o mapa `followUp` — incluindo `offerSkipped: 'no_consent'`, que revela que aquele cliente não deu consentimento de marketing. Nada disto é preciso para mostrar o portfólio; a app só usa título, categoria, fotos, tags e datas.
- **Cenário de falha:** alguém abre a consola do browser na app web (ou faz um pedido REST ao Firestore sem sessão) e descarrega a coleção `works` publicada. Fica com a lista de uids de clientes, o carro/chão de cada um, a data do serviço e o estado de consentimento e de acompanhamento de cada trabalho — um perfil pseudonimizado de toda a carteira, sem qualquer base legal para ser público. Cruzado com um uid conhecido (o próprio cliente conhece o seu), identifica a pessoa. Isto também enfraquece os termos §5, que prometem publicar as fotos "sem identificar o proprietário".
- **Evidência:**
  ```
  firestore.rules:106-109
    match /works/{workId} {
      allow read: if resource.data.published == true || isAdmin();
      allow write: if isAdmin();
    }
  ```
  ```ts
  // src/firebase/models.ts (Work)
  clientId?: string;
  vehicleId?: string;
  followUp?: WorkFollowUp;   // checkupSentAt, teamAlertSentAt, offerSkipped: 'no_consent' | 'no_account'
  ```
  O backoffice grava mesmo esses campos em trabalhos publicados (`WorkFormPage.tsx:219-220`).
- **Correção proposta:** as regras do Firestore não sabem filtrar campos, por isso a separação tem de ser de documentos. Duas hipóteses, por ordem de esforço:
  1. **Subcoleção privada** — mover `clientId`, `vehicleId` e `followUp` para `works/{id}/private/admin`, com `allow read, write: if isAdmin()`. O job `runFollowUps` e o backoffice passam a ler de lá; `works` fica só com o que é portfólio.
  2. **Documento espelho** — manter `works` como está (privado, `allow read: if isAdmin()`) e publicar um `portfolio/{id}` só com os campos públicos, escrito por uma Function. Mais trabalho, mas separa a montra dos dados de negócio de vez.
  Enquanto nenhuma das duas existir, o mínimo é deixar de gravar `followUp` em trabalhos publicados quando o acompanhamento estiver fechado (`active: false` → apagar o mapa).
- **Esforço:** M

---

### RGPD-06 — Os jobs, os triggers e os scripts imprimem emails, nomes e telemóveis de clientes
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** functions, scripts
- **Onde:** `functions/src/jobs/retention.ts:112`, `functions/src/jobs/retention.ts:121`, `functions/src/jobs/followUps.ts:71`, `functions/src/jobs/followUps.ts:78`, `functions/src/jobs/followUps.ts:108`, `functions/src/jobs/followUps.ts:129`, `functions/src/jobs/receipts.ts:48`, `functions/src/handlers.ts:148`, `functions/src/requests.ts:177`, `functions/src/scripts/runJobs.ts:58`, `functions/src/scripts/runJobs.ts:109`, `scripts/checkup-admin.mjs:95`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o `log` das Functions é `logger.info` (`index.ts:90`) e escreve emails, nomes e — via `clientLabel` — o email do cliente em cada transição de checkup. Isso vai para o Cloud Logging, onde fica 30 dias por omissão e é legível por qualquer conta com `logging.viewer` no projeto. A política de privacidade não fala em registos com dados pessoais: o que diz (`texts.ts:101`) é "registos de erros da app, **sem conteúdo pessoal**", e as fichas das lojas declaram "Registos de falhas: Não". Os mesmos textos saem no terminal quando se corre `npm run functions:jobs` ou `npm run checkup:admin` — e a saída do terminal acaba dentro das conversas do Claude.
- **Cenário de falha:** o job diário corre às 10:00 e escreve `checkup → joao@exemplo.pt · BMW M4 · PPF completo` no Cloud Logging. Um cliente apaga a conta nessa tarde; o email dele continua nos logs 30 dias, fora de qualquer fluxo de apagamento, e não há na política nada que o cubra. O precedente de que a saída do terminal chega ao sítio errado já existe neste projeto: a `checklist-contas.md:174` regista a chave do Resend colada por engano na conversa.
- **Evidência:**
  ```ts
  // functions/src/jobs/followUps.ts:71
  log(`checkup → ${client.email || client.id}${clientLocale(client) === 'en' ? ' (en)' : ''} · ${vehicle.name} · ${work.title}`);
  // functions/src/handlers.ts:148
  const clientLabel = `${client?.email || after.clientId}${locale === 'en' ? ' (en)' : ''}`;
  // functions/src/jobs/retention.ts:121
  log(`aviso de eliminação → ${client.email || client.id} (inativo desde …)`);
  // functions/src/index.ts:90
  const log = (msg: string) => logger.info(msg);
  ```
- **Correção proposta:** trocar o email pelo id em todas as linhas de log — o id já lá está como alternativa e é suficiente para depurar (é o caminho do doc no Firestore):
  ```ts
  // functions/src/jobs/followUps.ts:71 e equivalentes
  log(`checkup → ${client.id}${clientLocale(client) === 'en' ? ' (en)' : ''} · ${vehicle.name} · ${work.title}`);
  // functions/src/handlers.ts:148
  const clientLabel = `${after.clientId}${locale === 'en' ? ' (en)' : ''}`;
  ```
  Em `followUps.ts:78` e `:108` trocar `client.name` por `client.id`; em `receipts.ts:48` tirar `c.data()?.email`. Em `runJobs.ts` e `checkup-admin.mjs`, que são locais e servem para o Fábio se orientar, vale a pena manter o nome mas acrescentar um aviso no `DEVELOPMENT.md` de que a saída não se cola em conversas. Se se decidir manter os emails, então a política tem de passar a declarar os registos de operação com dados pessoais e o prazo de 30 dias.
- **Esforço:** S

---

### RGPD-07 — O consentimento do simulador só é verificado na app; nem as regras nem a Function o exigem
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** regras, functions
- **Onde:** `firestore.rules:236-247`, `firestore.rules:251`, `functions/src/simulations.ts:181-186`, `functions/src/types.ts:58-63`, `src/screens/SimulatorScreen.tsx:151`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a base legal do simulador é o consentimento (`texts.ts:116`) e a prova guarda-se em `clients.consent.simulatorVersion`. Só que `validNewSimulation` não lê o consentimento, `handleSimulationCreated` também não, e `ClientConsent` em `functions/src/types.ts` nem sequer tem o campo — as Functions não o conhecem. A única barreira é o `if` do ecrã.
- **Cenário de falha:** qualquer cliente com sessão cria um doc em `simulations` diretamente pelo SDK (ou por uma versão antiga da app, ou pela app web com a consola aberta) sem nunca ter visto a caixa. A Function pega nele, manda a foto para o Vertex AI e guarda o resultado. Fica um tratamento com base legal "consentimento" sem consentimento registado — e o backoffice mostra a simulação à equipa como se estivesse autorizada. Pelo mesmo caminho, uma conta anterior à Secção 16 que ainda tenha `simulatorVersion` de uma versão legal antiga passa na mesma.
- **Evidência:**
  ```
  firestore.rules:236-247 — validNewSimulation valida clientId, kind, photo, source,
  status, platform, createdAt e updatedAt. Nenhuma leitura de clients/{uid}.consent.
  ```
  ```ts
  // functions/src/simulations.ts:184-185 — a única guarda antes do modelo
  const fresh = await ref.get();
  if (!fresh.exists || fresh.data()?.processedAt || fresh.data()?.status !== 'pending') return;
  ```
  ```ts
  // functions/src/types.ts:58-63 — ClientConsent das Functions, sem simulatorVersion
  export interface ClientConsent { termsVersion; termsAcceptedAt; marketing; marketingUpdatedAt; }
  ```
- **Correção proposta:** impor no servidor, onde já se leem os tectos:
  ```ts
  // functions/src/simulations.ts, em handleSimulationCreated, antes do passo 1
  const c = await db.collection('clients').doc(sim.clientId).get();
  if (!c.data()?.consent?.simulatorVersion) {
    await ref.update({ status: 'failed', error: 'sem consentimento do simulador', processedAt: ts, updatedAt: ts });
    log(`simulação ${sim.id}: sem consentimento registado — não foi gerada`);
    return;
  }
  ```
  E acrescentar `simulatorVersion?: string; simulatorAcceptedAt?: Timestamp | null;` a `ClientConsent` em `functions/src/types.ts`, para o modelo das Functions voltar a espelhar o da app. Nas regras a verificação é mais cara (`get()` conta como leitura); a guarda na Function chega, porque sem ela a simulação nunca é gerada e a foto nunca sai para o Vertex.
- **Esforço:** S

---

### RGPD-08 — As notas internas da equipa sobrevivem ao "Apagar conta" na app, mas não à retenção
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/auth/AuthContext.tsx:285-297`, `functions/src/jobs/retention.ts:58-71`, `src/firebase/models.ts:98`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os dois caminhos de anonimização não fazem o mesmo. O job de retenção apaga `notes` (`retention.ts:64`); o "Apagar conta" da app não. `clients.notes` é texto livre que a equipa escreve sobre a pessoa e pode conter qualquer coisa — contactos alternativos, histórico de conversas, apreciações.
- **Cenário de falha:** um cliente exerce o direito ao apagamento pelo botão da app. O doc fica com `name: ''`, `email: ''`, `phone: ''`, `deletedAt` — e `notes: "Cliente do Sr. Manuel, ligar sempre para o 91…, reclamou do PPF em março"`. O backoffice continua a mostrar essas notas na ficha (`ClientDetailPage.tsx:143`). Se a mesma conta tivesse sido apagada pelo job dos 3 anos, as notas teriam desaparecido — duas respostas diferentes ao mesmo direito.
- **Evidência:**
  ```ts
  // functions/src/jobs/retention.ts:58-71 (apaga)
  await db.collection('clients').doc(client.id).update({
    name: '', email: '', phone: '',
    avatarUrl: FieldValue.delete(), pushTokens: FieldValue.delete(),
    notes: FieldValue.delete(),            // <—
    …
  // src/auth/AuthContext.tsx:285-297 (não apaga)
  await updateDoc(clientRef(user.uid), {
    name: '', email: '', phone: '',
    avatarUrl: deleteField(), pushTokens: deleteField(),
    notificationPrefs: { … }, 'consent.marketing': false, deletedAt: serverTimestamp(), …
  });
  ```
- **Correção proposta:** uma linha, e os dois caminhos passam a coincidir:
  ```ts
  // src/auth/AuthContext.tsx, dentro do updateDoc de deleteAccount
  notes: deleteField(),
  ```
  As regras já permitem (`clients` update pelo próprio). Vale a pena, ao mesmo tempo, acrescentar `deletedBy: 'client'` para ficar a par do `deletedBy: 'retention'` que o job escreve.
- **Esforço:** S

---

### RGPD-09 — As notas internas e os alertas internos da equipa são legíveis pelo próprio cliente
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** regras
- **Onde:** `firestore.rules:126`, `firestore.rules:190`, `src/firebase/models.ts:98`, `src/data/notifications.ts:24`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** as regras dão ao cliente leitura do **doc inteiro** `clients/{uid}` — incluindo `notes`, que o modelo descreve como "notas internas da equipa (só o backoffice lê e escreve)" — e leitura de todos os docs de `notifications` com o seu `clientId`, incluindo os `team_alert`. O filtro dos alertas internos existe só no cliente (`src/data/notifications.ts:24`), não nas regras.
- **Cenário de falha:** um cliente abre a app web, a consola do browser, e faz `getDoc(doc(db,'clients',uid))` — lê o que a equipa escreveu sobre ele. Ou lê os seus `team_alert` e vê o texto interno ("Ligar a João: checkup do BMW M4 … Telemóvel: 912…"). Pior: o alerta do tecto diário (`GUARD_TEXTS.dailyCap`) é criado com o `clientId` de quem fez o pedido que rebentou o tecto, e o texto diz quantos pedidos de orçamento a Marble recebeu em 24 h e qual é o tecto configurado — informação de negócio a sair para um cliente. Do lado do RGPD isto não é uma fuga (é o titular a ver dados sobre si), mas contradiz a expetativa escrita no código e no README do backoffice.
- **Evidência:**
  ```
  firestore.rules:125-129
    match /clients/{clientId} {
      allow read, update: if (signedIn() && request.auth.uid == clientId) || isAdmin();
  firestore.rules:189-190
    match /notifications/{notificationId} {
      allow read: if ownsResource() || isAdmin();
  ```
  ```ts
  // src/firebase/models.ts:97-98
  // Notas internas da equipa (só o backoffice lê e escreve).
  notes?: string;
  // src/data/notifications.ts:24 — o único filtro
  const data = useMemo(() => state.data.filter((n) => n.type !== 'team_alert'), [state.data]);
  ```
- **Correção proposta:** duas mudanças independentes.
  1. **`notes` fora do doc do cliente:** mover para `clients/{uid}/private/team` com `allow read, write: if isAdmin()`. O backoffice passa a ler de lá (`ClientDetailPage`, `ClientFormPage`, `mergeClients`); a app nunca o vê. Isto também resolve o RGPD-08 de vez.
  2. **`team_alert` fora do alcance do cliente:** ou usar um `clientId` diferente (ex.: guardar o cliente em `relatedClientId` e pôr `clientId: '__team'`), ou passar a negar a leitura nas regras:
     ```
     allow read: if isAdmin() || (ownsResource() && resource.data.type != 'team_alert');
     ```
     A segunda é uma linha, mas obriga as queries da app a filtrar por `type` no servidor (o Firestore recusa a query toda se um doc não passar) — na prática implica `where('type','!=','team_alert')` em `src/data/notifications.ts`, e um índice. Decidir com o Fábio.
  Independentemente disso, o alerta do tecto diário não devia sair no nome de um cliente: `requests.ts:190` e `simulations.ts:254` deviam usar um `clientId` da equipa, não `req.clientId`/`sim.clientId`.
- **Esforço:** M

---

### RGPD-10 — Não há caminho para o direito de acesso nem para a portabilidade
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `src/legal/texts.ts:159`, `src/legal/texts.ts:163`, `src/legal/texts.ts:167`, `DEVELOPMENT.md:196-199`, `../marble-backoffice/src/data/writes.ts`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a política promete cópia dos dados e portabilidade "num formato de uso corrente", com resposta em um mês. Não existe ecrã na app, nem exportação no backoffice (`writes.ts` não tem nada de export/CSV/JSON), nem procedimento escrito — o `DEVELOPMENT.md` limita-se a dizer "não há automatização; a equipa responde à mão". Ninguém sabe, hoje, quais são as sete coleções a juntar.
- **Cenário de falha:** chega um pedido de acesso a `app@marble.pt`. Quem o receber tem de saber ir a `clients`, `vehicles` (incluindo `checkupRequest`), `works` (por `clientId`), `notifications`, `requests`, `simulations`, ao Firebase Auth (datas de sessão) e ao Cloudinary (ficheiros por tag), e juntar tudo num ficheiro. Sem guião, ou a resposta fica incompleta (e é uma infração ao artigo 15.º) ou o prazo de um mês passa.
- **Evidência:**
  ```
  src/legal/texts.ts:159  'Aceder aos teus dados e receber uma cópia.'
  src/legal/texts.ts:163  '…receber os teus dados num formato de uso corrente (portabilidade).'
  DEVELOPMENT.md:196-199
    **Pedidos por email** (acesso, portabilidade, apagar sem a app): chegam ao
    `COMPANY.privacyEmail`. Não há automatização; a equipa responde à mão…
  ```
  `grep -n "export\|csv\|CSV" ../marble-backoffice/src/data/writes.ts` → só `export async function` (JavaScript), nenhuma exportação de dados.
- **Correção proposta:** um script de leitura ao lado dos que já existem, que resolve o problema em meia hora e não precisa de UI:
  ```
  scripts/export-client.mjs <chave.json> <email|uid> [--out cliente.json]
  ```
  que junta `clients/{uid}`, `vehicles` e `works` por `clientId`, `notifications` (excluindo `team_alert`), `requests`, `simulations`, os metadados do Auth (`creationTime`, `lastSignInTime`) e a lista de ficheiros do Cloudinary pelas tags `uid_<uid>`, `request_<id>` e `simulation_<id>`. Registar no `DEVELOPMENT.md`, secção "RGPD (Secção 3)", como **o** procedimento de resposta a um pedido de acesso, com o prazo de um mês. Uma página "Exportar dados" no backoffice é a versão bonita e pode vir depois.
- **Esforço:** M

---

### RGPD-11 — Não existe registo das atividades de tratamento (artigo 30.º)
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** hosting
- **Onde:** `DEVELOPMENT.md:164-199`, `ROADMAP.md:115-169`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** não há nenhum documento no repositório que liste as finalidades, as categorias de titulares e de dados, os destinatários, as transferências e os prazos. O artigo 30.º n.º 5 dispensa empresas com menos de 250 trabalhadores **exceto** quando o tratamento não é ocasional — e aqui é permanente (base de clientes, alertas, simulações) — pelo que na prática o registo é exigível.
- **Cenário de falha:** a CNPD pede o registo no seguimento de uma reclamação, ou o advogado pede-o para a revisão dos textos, e o que existe é o `DEVELOPMENT.md` — notas de desenvolvimento, não um registo. Tem de ser reconstruído a partir do código, que é exatamente o trabalho desta auditoria.
- **Evidência:** varrimento do repositório: `src/legal/` só tem `texts.ts` (política e termos); `docs/` tem `legal/` (as mesmas páginas), `store/` (fichas das lojas) e `index.html`. Nenhum ficheiro com registo de tratamentos, avaliação de impacto ou lista de subcontratantes com contratos.
- **Correção proposta:** a tabela de inventário desta auditoria **é** o registo, a menos de três colunas. Criar `docs/legal/registo-tratamentos.md` (não publicado no Hosting — `firebase.json` serve `docs/`, por isso pôr antes em `auditorias/` ou numa pasta nova fora de `docs/`) com: responsável (Cacto Elegante, Lda., NIF 519355849), finalidades, categorias de titulares (clientes particulares e empresas em Portugal) e de dados, destinatários (Google Ireland, Cloudinary Ltd., Resend Inc., Expo Inc.) com o tipo de contrato e as garantias de transferência, prazos de conservação e medidas técnicas. Manter a par da `LEGAL_VERSION`.
- **Esforço:** M

---

### RGPD-12 — Clientes de língua inglesa aceitam textos legais que só existem em português
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/screens/LegalScreen.tsx:34`, `src/i18n/en.ts:473`, `src/screens/LoginScreen.tsx:156-166`, `src/legal/texts.ts:75-268`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a app funciona em inglês (idioma do telemóvel), a caixa de aceitação no registo está em inglês e os links dizem "Terms of use" e "Privacy policy" — mas abrem um documento em português com o aviso "This document is available in Portuguese only". O artigo 7.º n.º 2 e o artigo 12.º n.º 1 exigem que o pedido de consentimento e a informação sejam apresentados em linguagem clara e **inteligível** para o titular.
- **Cenário de falha:** um cliente estrangeiro cria conta pela app em inglês, aceita a caixa e usa o simulador. O consentimento fica registado em `consent.termsVersion`, mas assenta num texto que ele não consegue ler. Se contestar, a prova do consentimento é fraca precisamente onde a base legal é o consentimento (marketing e simulador).
- **Evidência:**
  ```ts
  // src/i18n/en.ts:473
  portugueseOnly: 'This document is available in Portuguese only.',
  // src/screens/LegalScreen.tsx:34
  {T.legal.portugueseOnly ? <Text style={styles.notice}>{T.legal.portugueseOnly}</Text> : null}
  ```
  A decisão está documentada em `SPEC.md` (Decisões de arquitetura → Idioma): "os textos legais existem só em português (em inglês a app avisa 'This document is available in Portuguese only')", e em `ROADMAP.md` Secção 12 — o motivo é que a revisão jurídica é de um texto só. Este achado não a contraria: diz que a decisão tem um custo legal que devia ser tomado com consciência.
- **Correção proposta:** juntar ao pacote da revisão jurídica (que já está por fazer, `ROADMAP.md:166`): pedir ao advogado que a versão final saia em PT e EN, e acrescentar `LEGAL` em inglês a `src/legal/texts.ts` (a estrutura `LegalText` já suporta, e o `build:legal` gera os HTML de ambas). Enquanto isso não existir, a mitigação barata é mostrar, na caixa de aceitação em inglês, um resumo de quatro linhas do essencial (que dados, para quê, quanto tempo, como apagar) por cima do link para o texto português.
- **Esforço:** L (depende do advogado)

---

### RGPD-13 — As fotos no Cloudinary são entregues por URL público não assinado
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/media/cloudinary.ts:42-44`, `src/media/cloudinary.ts:131-134`, `src/media/cloudinary.ts:170-177`, `functions/src/simulations.ts:172-179`, `src/legal/texts.ts:177`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** todos os URL gerados são de entrega pública (`/image/upload/…`), sem assinatura nem tipo `authenticated`. Quem tiver o URL — ou o obtiver de um email do Resend, de uma partilha, ou de um log — vê a imagem sem sessão nenhuma, para sempre (até o ficheiro ser apagado). Isto vale para a foto de perfil, para as fotos dos pedidos e, o mais sensível, para as fotos do interior da casa, da garagem ou do carro carregadas no simulador. A política diz, em "Segurança", que "só tu, com a tua sessão, consegues ler os teus dados" — o que é verdade no Firestore e falso no alojamento das imagens.
- **Cenário de falha:** o email à equipa de um pedido de orçamento leva os URL das fotos em texto simples (`functions/src/texts.ts:331-332`). Esse email passa pelo Resend, fica na caixa `quotes@marble.pt` e é reencaminhado internamente; qualquer pessoa por quem passe vê as fotografias do espaço do cliente, sem autenticação, mesmo depois de o pedido ser fechado — até à anonimização aos 12 meses, que é quando os ficheiros são apagados.
- **Evidência:**
  ```ts
  // src/media/cloudinary.ts:173 — URL de uma foto de simulação
  url: `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_1600,q_auto,f_auto/${v}${publicId}`,
  // functions/src/texts.ts:331-332 — o que vai no email à equipa
  r.photos?.length ? `Fotos (${r.photos.length}):\n${r.photos.map((p) => p.url).join('\n')}` : '',
  r.simulation ? `Simulação "como ficaria" (…):\nFoto do cliente: ${r.simulation.photoUrl}…` : '',
  ```
  ```
  src/legal/texts.ts:177
  'As regras de acesso à base de dados garantem que só tu, com a tua sessão,
   consegues ler os teus dados…'
  ```
- **Correção proposta:** o URL não adivinhável é uma defesa fraca mas real, e mudar para entrega assinada obriga a Function a assinar cada URL (a app e o backoffice deixam de poder montar o URL sozinhos) — é uma mudança grande. O mínimo defensável, por ordem:
  1. **Ligar "Strict transformations"** na consola do Cloudinary, para que só as transformações que a app usa sejam servidas (hoje qualquer pessoa pode pedir o original em tamanho máximo a partir de um URL reduzido).
  2. **Deixar de pôr URL de imagens no corpo do email** à equipa: trocar pelos links do backoffice (`${backofficeUrl}/pedidos/${id}`), que pedem sessão com o claim `admin`.
  3. **Afinar a redação** da política §9 para dizer a verdade: que as fotografias são servidas por endereços não públicos mas não autenticados, e que quem tiver o endereço consegue vê-las.
- **Esforço:** M

---

### RGPD-14 — O projeto de dev partilha a conta Cloudinary do prod e nunca apaga ficheiros
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/.env:15`, `functions/.env.marble-studios-prod:10`, `.env:16`, `.env.production:17`, `../marble-backoffice/README.md:110-113`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** dev e prod usam o **mesmo** cloud Cloudinary (`kr9bmaqh`), mas no dev `CLOUDINARY_CLEANUP=off`: a `onClientUpdated`, a `onRequestWritten` e a `onSimulationWritten` limitam-se a registar nos logs que ficou por apagar. Ou seja, tudo o que se carregar contra o dev — e o dev tem dados reais: a conta do Fábio, o Jaguar dele, a simulação real de 2026-09-10 — fica no alojamento para sempre, ao lado dos ficheiros do prod, sem prazo de retenção.
- **Cenário de falha:** o Fábio ou um cliente-teste carrega uma foto de perfil ou do espaço no ambiente de dev (é o que se faz em cada secção). A conta de teste é apagada, o `avatarUrl` sai do Firestore, mas o ficheiro fica na Media Library do mesmo cloud que serve a produção, sem nada que o ligue a um prazo. O `ROADMAP.md` Secção 16 regista precisamente isto: "os ficheiros ficam no Cloudinary com a tag `simulation_SZxokGzfnyl2eP3AGN4k` até a limpeza (segredos) existir". Os 30 dias prometidos em `texts.ts:148` não se aplicam ao que estiver no dev.
- **Evidência:**
  ```
  functions/.env:15                       CLOUDINARY_CLEANUP=off
  functions/.env.marble-studios-prod:10   CLOUDINARY_CLEANUP=on
  .env:16              EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=kr9bmaqh
  .env.production:17   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=kr9bmaqh
  ```
  `functions/src/simulations.ts:85-87` — sem credenciais, só `log('cloudinary: sem credenciais — ficheiros de … ficam por apagar')`.
- **Correção proposta:** os segredos do Cloudinary já existem no prod desde 2026-09-06; o passo em falta é pô-los também no dev e ligar o interruptor:
  ```
  npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_KEY --project dev
  npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_SECRET --project dev
  # depois: functions/.env → CLOUDINARY_CLEANUP=on, e deploy --only functions --project dev
  ```
  (é o Fábio que introduz os valores, no PowerShell dele — o Claude não vê segredos). A médio prazo, separar os dois ambientes em pastas diferentes do Cloudinary (prefixo nos presets `marble-*-dev`) ou em contas diferentes, para uma limpeza por engano nunca tocar em ficheiros de produção. Fazer isto **depois** da rotação de chaves da checklist 6d, para não pôr a chave antiga em mais um sítio.
- **Esforço:** S (depende do Fábio para os segredos)

---

### RGPD-15 — Credenciais que dão acesso a dados pessoais continuam por rodar, e a password da conta de demonstração do prod está no git
- **Vertente:** rgpd
- **Severidade:** Médio
- **Superfície:** scripts
- **Onde:** `docs/store/checklist-contas.md:172-189`, `docs/store/ficha-loja.md:118`, `docs/store/ficha-loja.md:125`, `docs/store/ficha-loja.md:134`, `DEVELOPMENT.md:1395`
- **Confiança:** confirmado (a password está num ficheiro versionado e enviado para o GitHub); provável quanto ao alcance (não confirmei se o repositório `github.com/vampiregodric/marble-app` é público)
- **Estado:** aberto
- **O que está mal:** duas coisas na mesma família. (1) A chave do Resend e o API secret do Cloudinary foram colados numa conversa a 2026-09-06 e continuam por rodar (checklist 6d, marcada "antes do lançamento"); quem tiver o par do Cloudinary lista e descarrega **todos** os ficheiros do cloud — as fotos de perfil, dos pedidos e do simulador de todos os clientes — e quem tiver a do Resend envia email como `app@marble.pt`. (2) A password da conta de demonstração criada no **prod** está em texto simples num ficheiro versionado, duas vezes.
- **Cenário de falha:** o repositório está no GitHub e passou a ter, desde 2026-09-08, um par email/password válido no projeto de produção. Quem o leia entra na app real com sessão de cliente. A conta só tem dados de demonstração, mas a sessão é válida no prod: dá para criar pedidos de orçamento (que disparam email à equipa e consomem o tecto diário) e simulações (que custam dinheiro no Vertex AI). E a regra que a própria checklist escreveu — "as chaves colam-se só na janela do PowerShell, nunca na conversa" — não impede um ficheiro versionado.
- **Evidência:**
  ```
  docs/store/checklist-contas.md:172-176
    ### 6d. Trocar as chaves que ficaram na conversa — 10 min, antes do lançamento
    A chave do Resend e o API secret do Cloudinary foram colados por engano no
    chat com o Claude a 2026-09-06. Não é grave (a conversa é privada), mas
    antes do lançamento convém rodá-los:
  docs/store/ficha-loja.md:118
    (`scripts/demo-account.mjs`): `revisao@marble.pt` / `Marble-Revisao-2026!`,
  ```
  `git ls-files docs/store/` confirma que os dois ficheiros estão versionados. `DEVELOPMENT.md:1395` continua a marcar a rotação como pendente: "**Rodar antes do lançamento** (ficaram colados na conversa — checklist 6d)".
- **Correção proposta:** (1) executar a checklist 6d — rodar o par do Cloudinary e a chave do Resend, repor os segredos no Secret Manager dos dois projetos e voltar a publicar as Functions; (2) tirar a password de `ficha-loja.md` e de `checklist-contas.md`, deixando só o email e uma nota a dizer onde vive a password (gestor de passwords do Fábio, ou as duas consolas das lojas), e correr `npm run demo:account -- … --apply` com uma password nova. O histórico do git guarda a antiga, o que é mais um motivo para a trocar. O `demo-account.mjs:173` já diz "a password não fica guardada em mais lado nenhum" — a instrução de a copiar para `ficha-loja.md` (linha 16 do script) é que devia mudar.
- **Esforço:** S
- **Nota:** sobrepõe-se provavelmente a um achado da vertente de segurança; fica aqui porque a chave do Cloudinary é o que protege as fotografias dos clientes.

---

### RGPD-16 — A política não declara vários dados que a app e o Firebase recolhem
- **Vertente:** rgpd
- **Severidade:** Baixo
- **Superfície:** hosting
- **Onde:** `src/legal/texts.ts:94-105`, `src/firebase/models.ts:85`, `src/firebase/models.ts:98`, `src/firebase/models.ts:126`, `src/firebase/models.ts:575`, `docs/store/data-safety.md:128-131`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a secção 2 da política ("Que dados recolhemos") não menciona: as **notas internas** que a equipa escreve sobre o cliente (`clients.notes`), a **data da última utilização** (`lastActiveAt`), o **idioma** (`clients.locale`), a **plataforma** de onde veio o pedido (`requests.platform`) e o **endereço IP e user-agent** que o Firebase Authentication guarda. As fichas das lojas já declaram o `lastActiveAt` e o IP — ou seja, as duas fontes discordam entre si.
- **Cenário de falha:** um cliente pede a lista dos dados tratados (artigo 15.º) e compara com a política; as notas internas sobre ele não estavam declaradas em lado nenhum. É o tipo de descoberta que transforma um pedido de acesso numa reclamação.
- **Evidência:** a própria `data-safety.md:128-131` reconhece uma das lacunas:
  ```
  - Quando a política de privacidade for revista (advogado), acrescentar aos
    "dados técnicos mínimos" o endereço IP e o agente do utilizador que o
    Firebase Authentication guarda — hoje a política só fala no identificador
    do dispositivo para push e em registos de erros.
  ```
  E `src/legal/texts.ts:101` é o único bullet técnico: "um identificador do dispositivo para entregar notificações push … e registos de erros da app, sem conteúdo pessoal".
- **Correção proposta:** dois bullets novos na secção 2, para levar junto com a revisão jurídica:
  ```ts
  'Notas da equipa sobre o teu acompanhamento, escritas por nós na tua ficha interna ' +
  '(por exemplo, o que combinámos numa chamada). Podes pedir uma cópia por email.',
  'Dados técnicos mínimos: um identificador do dispositivo para entregar notificações push ' +
  '(só se as ativares), o idioma do teu telemóvel e a plataforma que usaste, a data da última ' +
  'vez que abriste a app (para a regra das contas inativas), e o endereço IP e o tipo de ' +
  'dispositivo que o serviço de autenticação regista por segurança.',
  ```
  Alteração material → subir `LEGAL_VERSION` e correr `npm run build:legal`. Juntar ao mesmo lote do RGPD-01 e do RGPD-12, para não fazer três subidas de versão.
- **Esforço:** S

---

### RGPD-17 — Retirar o consentimento do simulador não repõe a pergunta
- **Vertente:** rgpd
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/legal/texts.ts:162`, `src/auth/AuthContext.tsx:197`, `src/auth/AuthContext.tsx:261-268`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a política diz que o consentimento do simulador se retira "apagando as simulações no Perfil ou na própria simulação". Apagar simulações não toca em `consent.simulatorVersion`: o campo fica gravado, `needsSimulatorConsent` continua a false e a caixa nunca mais aparece. Um `grep` a todo o código confirma que o campo só é **escrito** (em `acceptSimulatorConsent`) e nunca limpo — nem no "Apagar conta", nem na retenção.
- **Cenário de falha:** um cliente experimenta o simulador, arrepende-se e apaga a simulação a pensar que retirou a autorização. Na semana seguinte volta a usar o simulador e a foto é enviada de novo, sem lhe voltar a ser perguntado — exatamente o contrário do que leu.
- **Evidência:**
  ```ts
  // src/auth/AuthContext.tsx:197
  needsSimulatorConsent: !client || client.consent?.simulatorVersion !== LEGAL_VERSION,
  ```
  ```
  src/legal/texts.ts:162
  'Retirar o consentimento para marketing a qualquer momento, em Perfil > Ofertas
   e novidades, e o consentimento do simulador apagando as tuas simulações…'
  ```
  `grep -rn "simulatorVersion" src/ functions/ ../marble-backoffice/src` → 6 ocorrências, nenhuma de limpeza.
- **Correção proposta:** duas hipóteses, e a segunda é a honesta.
  1. Limpar o consentimento quando a última simulação do cliente desaparece (em `deleteSimulation`, `src/data/simulations.ts`): `'consent.simulatorVersion': deleteField()`. Simples, mas o comportamento — "apagar a última simulação repõe a pergunta" — é subtil de explicar.
  2. **Preferível:** corrigir o texto da política para descrever o que existe ("apagar as simulações apaga as fotografias e as imagens geradas; para retirares a autorização, escreve-nos para app@marble.pt") **e** acrescentar uma linha no Perfil, ao lado de "Ofertas e novidades", que retire o consentimento do simulador e apague as simulações num gesto só. É a leitura certa do artigo 7.º n.º 3: retirar o consentimento tem de ser tão fácil como dá-lo.
- **Esforço:** S (opção 1) / M (opção 2)

---

### RGPD-18 — A política e os termos descrevem um simulador que as builds de produção não têm
- **Vertente:** rgpd
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `.env.production:17-22`, `src/media/cloudinary.ts:28`, `src/media/cloudinary.ts:34`, `src/legal/texts.ts:99`, `src/legal/texts.ts:232`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `.env.production` não define `EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS`, por isso `simulationUploadConfigured` é `false` e o simulador não aparece em lado nenhum numa build de produção. Entretanto a política publicada (§2, §3, §5, §6, §7) e os termos (§1, §5) já descrevem o simulador como uma funcionalidade existente.
- **Cenário de falha:** a app entra nas lojas; um cliente lê na política que a app tem um simulador que envia a foto dele para um modelo de IA e não o encontra. Não é um risco de dados — é o contrário: a política declara mais do que a app faz. Mas é uma incoerência que salta à vista de quem rever os textos, e esconde o facto de o simulador ainda não ter sido validado em produção.
- **Evidência:**
  ```
  .env.production — tem CLOUD_NAME, PRESET_AVATARS e PRESET_REQUESTS;
  não tem EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS (o .env do dev tem, linha 22).
  ```
  ```ts
  // src/media/cloudinary.ts:28,34
  const simulationPreset = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS ?? '';
  export const simulationUploadConfigured = Boolean(cloudName && simulationPreset);
  ```
- **Correção proposta:** decidir e alinhar. Se o simulador vai com a primeira versão, acrescentar a variável ao `.env.production` **depois** de criar o preset `marble-simulations` e ativar o Vertex AI no projeto de prod (`DEVELOPMENT.md`, "Simulador", passos 1 e 2 — feitos só no dev), e resolver antes o RGPD-01. Se não vai, tirar o simulador dos textos legais desta versão e voltar a pô-lo quando entrar — evita anunciar um tratamento que não existe.
- **Esforço:** S

---

### RGPD-19 — Um único claim `admin` para toda a equipa, sem níveis nem registo de quem viu o quê
- **Vertente:** rgpd
- **Severidade:** Sugestão
- **Superfície:** regras
- **Onde:** `firestore.rules:55-57`, `../marble-backoffice/README.md:45-63`, `src/legal/texts.ts:177`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** quem tem `admin: true` lê e escreve tudo: fichas de clientes, matrículas, notas internas, pedidos, e **todas as simulações** — incluindo fotografias do interior da casa de qualquer cliente (decisão do Fábio, 2026-09-09, que esta auditoria não contesta: é a finalidade). Não há níveis (um estagiário vê o mesmo que o dono) nem qualquer registo de acessos. O artigo 32.º pede medidas adequadas ao risco, e fotografias do interior de casas são um risco acima da média.
- **Cenário de falha:** entra alguém novo na equipa, recebe o claim para gerir o portfólio, e passa a poder navegar em `/simulacoes` e ver as fotos de casa de todos os clientes. Se acontecer um uso indevido, não há maneira de saber quem abriu o quê — o SDK de cliente escreve diretamente no Firestore, sem servidor pelo meio.
- **Evidência:**
  ```
  firestore.rules:55-57
    function isAdmin() { return signedIn() && request.auth.token.admin == true; }
  ../marble-backoffice/README.md:52
    node scripts/set-admin.mjs <chave.json> alguem@marble.pt   # dá acesso
  ```
- **Correção proposta:** nada disto é urgente a esta escala, e a política já descreve o que existe. Vale a pena, por ordem de valor:
  1. Escrever no `DEVELOPMENT.md` (ou no README do backoffice) **quem** tem o claim e a data, e rever a lista a cada lançamento — `set-admin.mjs --list` já a produz.
  2. Ativar os Data Access audit logs do Firestore na consola do Google Cloud para o projeto de prod: fica registado quem leu o quê, sem escrever uma linha de código (tem custo por volume, que a esta escala é residual).
  3. Se um dia a equipa crescer, um segundo claim (`admin` vs `viewer`) que tire as simulações e as notas a quem só publica portfólio.
- **Esforço:** S (passos 1 e 2)

---

### RGPD-20 — A revisão jurídica e a cláusula 5 dos termos continuam por confirmar antes do lançamento
- **Vertente:** rgpd
- **Severidade:** Sugestão
- **Superfície:** hosting
- **Onde:** `ROADMAP.md:164-169`, `docs/store/checklist-contas.md:257-259`, `src/legal/texts.ts:230`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** não é um defeito do código — é o passo que dá sentido a todos os outros e que está sinalizado no ROADMAP desde a Secção 3. A cláusula 5 dos termos assume o consentimento do cliente para publicar fotos do trabalho no portfólio e nas redes sociais "sem identificar o proprietário e com a matrícula ocultada, salvo pedido em contrário" — é um opt-out, e não há em lado nenhum do código um campo que registe quem pediu o contrário.
- **Cenário de falha:** um cliente diz à equipa "não quero o meu carro no portfólio". Hoje isso vive numa conversa ou, na melhor das hipóteses, nas `clients.notes`; nada o impede de o trabalho ser publicado por outra pessoa da equipa, e nada o prova depois.
- **Evidência:**
  ```
  ROADMAP.md:166-169
    **Fica para depois:** revisão por advogado; … Ponto a confirmar com a Marble
    Studios: a cláusula 5 dos termos assume que fotos dos trabalhos podem ir para
    o portfólio/redes sem identificar o dono e com matrícula ocultada, salvo
    pedido em contrário.
  ```
  `grep` por um campo de recusa de publicação em `models.ts`, `writes.ts` e `WorkFormPage.tsx`: não existe.
- **Correção proposta:** juntar os achados desta auditoria que mexem nos textos (RGPD-01, RGPD-12, RGPD-16, RGPD-17) num só lote para o advogado, e levar-lhe também a pergunta da cláusula 5. Do lado do código, um campo `clients.noPortfolio?: boolean` (ou `vehicles.noPortfolio`) com um aviso no formulário de trabalho do backoffice resolve o registo da recusa em meia hora e é a prova que hoje não existe.
- **Esforço:** L (depende do advogado)

## O que está bem

Verificado e correto — não precisa de ser reaberto na próxima corrida:

- **Consentimento de marketing respeitado em três camadas independentes:** quem cria o alerta (`functions/src/consent.ts:17` → `canReceive`), quem faz o push (`functions/src/push.ts:40`, que revalida porque o cliente pode ter desligado entretanto) e o backoffice (`../marble-backoffice/src/data/writes.ts:234`, que recusa com uma mensagem clara). `MARKETING_NOTIFICATION_TYPES` é a mesma lista nos três sítios.
- **A checkbox dos termos nunca vem pré-marcada**, nem no registo (`src/screens/LoginScreen.tsx:156`), nem no pedido de orçamento sem conta (`src/screens/RequestQuoteScreen.tsx:474`), nem no simulador (`src/screens/SimulatorScreen.tsx:276`). Os três validam do lado do código antes de criar a conta (`AuthContext.tsx:204,217`).
- **Prova de consentimento guardada com versão e data** (`ClientConsent` em `src/firebase/models.ts:51-67`), e a subida de `LEGAL_VERSION` volta a pedir aceitação e volta a pedir o consentimento do simulador — o mecanismo funciona e foi exercitado na Secção 16.
- **A oferta de marketing não é enviada retroativamente:** sem consentimento na data, `followUp.offerSkipped: 'no_consent'` fecha o passo e a equipa vê porquê no backoffice (`functions/src/jobs/followUps.ts:117-136`). É a leitura certa: o consentimento tem de existir no momento do envio.
- **Retenção de pedidos e de simulações implementada e a correr no job diário** (`functions/src/jobs/index.ts:42-44`), com os prazos exatamente iguais aos prometidos (365 dias / 90 dias) e a limpeza dos ficheiros no Cloudinary a seguir o apagamento do doc pelas tags `request_<id>` e `simulation_<id>`.
- **A foto de perfil sai do alojamento em segundos, não nos 30 dias prometidos** (`functions/src/handlers.ts:70-80` + `deleteAvatarFiles`), com `CLOUDINARY_CLEANUP=on` no prod.
- **A anonimização em cascata está ligada aos dois caminhos de apagamento** (botão da app e job dos 3 anos), porque ambos passam por `deletedAt` e pelo trigger `onClientUpdated` (`functions/src/handlers.ts:66-69`).
- **`delete: false` em `clients`** (`firestore.rules:128`) impede que uma sessão comprometida — de cliente ou de equipa — destrua o histórico; a anonimização é a estratégia certa para este modelo.
- **`team_alert` nunca leva push** (`functions/src/push.ts:32`): o nome e o telemóvel dos alertas internos não saem para o Expo, nos EUA.
- **As fotos do cliente só sobem com presets unsigned dedicados e tags previsíveis** (`src/media/cloudinary.ts:94,116,153`), o que é o que torna a limpeza automática possível — a tag do pedido é separada da tag do uid precisamente para a limpeza de uma não apagar a outra.
- **Os HTML públicos estão em sincronia com `texts.ts`** (os três em `docs/legal/` dizem "Versão de 2026-09-09", gerados por `npm run build:legal`), e a página `apagar-conta.html` que o Google Play exige existe e descreve os dois caminhos.
- **Não há analytics, nem SDK de publicidade, nem Crashlytics/Sentry** — verificado por varrimento das dependências e do código; as fichas das lojas declaram-no corretamente.
- **O cliente vê os seus pedidos e as suas simulações na app** (`ProfileScreen.tsx:475-485`, `T.profile.requestsTitle`/`simulationsTitle`) e pode apagar as simulações — não é portabilidade, mas é transparência real sobre o que está guardado.
- **"Juntar fichas" no backoffice anonimiza em vez de apagar** e transfere carros, trabalhos e alertas (`../marble-backoffice/src/data/writes.ts:170-199`), deixando `mergedInto` + `deletedAt` — o mesmo padrão do apagamento de conta, coerente.

## Não verificado

- **Se existem contas de clientes reais no projeto de dev** e quantas. Esta corrida é só de leitura de código; não corri `scripts/check-firestore.mjs` nem qualquer consulta ao Firestore (o enunciado limita os comandos a `git log` e `grep`). O que se sabe pelos documentos: o dev tem a conta do Fábio, o Jaguar dele e pelo menos uma simulação real (`ROADMAP.md`, Secção 16). Isto pesa no RGPD-14.
- **A visibilidade do repositório `github.com/vampiregodric/marble-app`** (público ou privado). Determina se a password da conta de demonstração do prod (RGPD-15) está exposta a qualquer pessoa ou só a quem tem acesso ao repositório.
- **Se os contratos de subcontratação existem de facto** com a Google Ireland, a Cloudinary, a Resend e a Expo (DPA assinado ou aceite nos termos de serviço). A política afirma que sim; isso não se verifica no código, verifica-se nas consolas de cada fornecedor. É item para o mesmo lote da revisão jurídica.
- **A política de retenção efetiva do Cloud Logging** no projeto de prod (30 dias é o valor por omissão; pode ter sido mudado na consola). Afeta o prazo real do RGPD-06.
- **Se as fichas de privacidade já foram submetidas** nas consolas da Play e da App Store. A `checklist-contas.md:243-244` diz que a "Ficha da app nas duas consolas" continua por fazer, o que é a leitura favorável para o RGPD-04 — se já tiverem sido submetidas, a severidade sobe.
- **Se o modelo `gemini-3.1-flash-image` existe em `europe-west1`**, o que decidiria entre as duas correções propostas para o RGPD-01. Não consultei a documentação da Google nesta corrida.
- **`ProfileScreen.tsx`, `NotificationsOnboardingScreen.tsx`, `RequestDetailPage.tsx` e `SendAlertModal.tsx`** foram lidos só por `grep` dirigido ao consentimento e aos dados mostrados, não na íntegra. O que se verificou (opt-in de marketing desligado por defeito, revelação das categorias só com o opt-in ligado, modelos PT/EN no alerta manual) está correto; uma leitura completa pode ainda encontrar acabamentos de redação.
