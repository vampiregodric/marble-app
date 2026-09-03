# Marble Studios App — Roadmap de Construção

## Como usar este documento

Este projeto vai ser construído em várias conversas separadas, cada uma
focada numa secção. Se estás a começar uma conversa nova para atacar uma
secção específica, faz isto primeiro:

1. Lê `SPEC.md` — os requisitos de negócio (o que o dono da Marble Studios
   pediu, decisões tomadas, coisas ainda em aberto).
2. Lê `DEVELOPMENT.md` — como correr o projeto, estado técnico atual,
   avisos conhecidos.
3. Volta aqui e lê APENAS a secção que te foi pedida. Não precisas de
   perceber as outras secções para trabalhar na tua.
4. No fim, atualiza o estado da secção neste ficheiro (de "Por fazer" para
   "Feito", com uma nota do que foi construído) para a próxima conversa
   saber onde ficámos.

Diz ao Claude, no início dessa conversa, algo como: *"Estou a trabalhar no
projeto Marble Studios em C:\Users\VGodr\Projects\marble-app — lê o
ROADMAP.md e ataca a Secção 3."*

---

## Base (concluída)

O esqueleto da app está construído e commitado (`git log` tem o commit
inicial). Inclui:

- Projeto Expo/React Native (TypeScript), navegação por tabs + stack
- Tema visual (`src/theme/theme.ts`): cores preto/dourado, tipografia
  (Alex Brush, Jost, Manrope)
- 6 ecrãs de UI, com **dados de exemplo fixos** (ainda sem backend real):
  - `src/screens/HomeScreen.tsx` — Início
  - `src/screens/PortfolioScreen.tsx` — Portfólio
  - `src/screens/EventsScreen.tsx` — Eventos
  - `src/screens/AlertsScreen.tsx` — Alertas
  - `src/screens/ProfileScreen.tsx` — Perfil
  - `src/screens/WorkDetailScreen.tsx` — Detalhe de um trabalho
- Assets reais: logótipo (`assets/logo.png`), uma foto de trabalho
  (`assets/work-jaguar-purple.jpg`)
- Firebase SDK instalado, config por preencher (`src/firebase/config.ts`)

---

## Secções por construir

Cada secção abaixo está pensada para ser atacada isoladamente. As que têm
"Depende de" precisam de outra secção estar feita primeiro; as outras
podem avançar em qualquer ordem ou em paralelo (conversas diferentes).

### Secção 1 — Firebase & modelo de dados
**Estado:** Em progresso — infraestrutura de código pronta, falta criar os
projetos Firebase reais (passo manual, ver `DEVELOPMENT.md` → "Firebase: os
dois projetos"). Depois de criados e do `.env`/`.env.production` preenchidos,
esta secção fica completa.
**Depende de:** nada — pode começar já
**Objetivo:** Criar **dois** projetos Firebase — um de desenvolvimento
(`marble-studios-dev` ou semelhante) e um de produção (`marble-studios-prod`)
— para nunca arriscarmos partir dados reais de clientes ao testar coisas
novas. Ativar Firestore + Authentication nos dois. Preencher
`src/firebase/config.ts` para apontar ao projeto de dev por omissão (usar
variável de ambiente para trocar para produção no build final). Desenhar
a estrutura de coleções: `clients`, `vehicles` (carro/chão, ligado a um
`clientId`), `works` (trabalhos do portfólio), `events`,
`notifications`/`reminders`.
**Critério de conclusão:** app liga-se ao Firebase de dev sem erros;
coleções criadas na consola com pelo menos um documento de exemplo em
cada; projeto de produção existe mas fica "vazio" até ao lançamento.
**Nota (2026-09-03):** construído nesta sessão —
`src/firebase/config.ts` agora lê `EXPO_PUBLIC_FIREBASE_*` de `.env`
(dev) / `.env.production` (prod) em vez de valores fixos; modelo de dados
TypeScript das 5 coleções em `src/firebase/models.ts`; `firestore.rules` +
`firestore.indexes.json` + `firebase.json` + `.firebaserc` (aliases `dev`/
`prod`) prontos para deploy via CLI; script `npm run seed -- <chave.json>`
(`scripts/seed-firestore.mjs`) para popular um documento de exemplo por
coleção via Firebase Admin SDK. Falta só o passo manual: criar os dois
projetos na consola Firebase e colar a config real nos `.env*` — ver
`DEVELOPMENT.md`.

### Secção 2 — Autenticação de cliente
**Estado:** Por fazer
**Depende de:** Secção 1
**Objetivo:** Ecrã de login/registo (email/password, e possivelmente
Google/Apple sign-in), ligado ao Firebase Auth. Perfil passa a mostrar
dados do utilizador autenticado em vez do "Fábio Pombinho" fixo.
**Ficheiros:** novo `src/screens/LoginScreen.tsx`, ajustar
`RootNavigator.tsx` para mostrar login antes das tabs quando não há sessão.

### Secção 3 — Conformidade RGPD
**Estado:** Por fazer
**Depende de:** Secção 1, Secção 2
**Objetivo:** A app vai guardar dados pessoais reais (nome, contacto,
carro/matrícula) de clientes de um negócio na UE — isto traz obrigações
legais, não é só "ter uma página de política de privacidade" para
cumprir os requisitos da loja. Construir:
- Ecrã de política de privacidade + termos, com aceitação explícita no
  registo (não pré-marcada)
- Consentimento **separado** para notificações de marketing (ex: oferta
  de lavagem grátis) — diferente do consentimento para notificações
  operacionais (ex: lembrete de checkup do teu próprio carro)
- Opção "apagar a minha conta e dados" no Perfil, que remove/anonimiza
  o registo do cliente no Firestore
- Definir por quanto tempo os dados são guardados depois de um cliente
  sair (política de retenção)
**Nota:** vale a pena confirmar com um advogado/contabilista da Marble
Studios se há mais alguma obrigação específica (ex: faturas, dados
fiscais) — isto cobre a parte de proteção de dados pessoais na app, não
é aconselhamento legal.

### Secção 4 — Ligar os 6 ecrãs a dados reais
**Estado:** Por fazer
**Depende de:** Secção 1 (e idealmente Secção 2)
**Objetivo:** Substituir os arrays de exemplo (`WORKS`, `EVENTS`,
`ALERTS`, `departments`, etc.) por queries Firestore reais, ecrã a ecrã.
Pode ser dividido ainda mais (ex: "Secção 4a — Portfólio real",
"Secção 4b — Perfil real") se uma conversa não chegar para os 6.
**Nota:** este é o maior bloco de trabalho — vale a pena fatiar por ecrã.

### Secção 5 — Painel da equipa (backoffice)
**Estado:** Por fazer
**Depende de:** Secção 1
**Objetivo:** Interface para a equipa da Marble Studios gerir clientes,
carros/chãos, trabalhos (adicionar ao portfólio), eventos, e escolher o
que aparece no carrossel do Início. **Confirmado: é uma app separada**
da app do cliente, não faz parte deste projeto React Native — vai ser um
projeto novo/próprio, a apontar ao mesmo Firebase.
**Decisão em aberto:** web (mais rápido de construir e usar num
computador da loja) ou também mobile? A recomendação é começar por web —
a equipa provavelmente vai gerir isto de um computador, não em
movimento, e web evita duplicar trabalho de UI numa fase inicial.

### Secção 6 — Notificações push automáticas
**Estado:** Por fazer
**Depende de:** Secção 1, Secção 3 (consentimento), Secção 4
**Objetivo:** Firebase Cloud Messaging + Cloud Functions (ou scheduler
equivalente) para o fluxo descrito no SPEC.md: +1 semana após um trabalho
→ lembrete de checkup; sem confirmação → alerta interno à equipa; +1 mês
→ oferta automática (lavagem grátis para carros, inspeção/manutenção
para chãos — **por confirmar com o Fábio**, ver SPEC.md). Respeitar
sempre a preferência de consentimento de marketing definida na Secção 3.

### Secção 7 — Ecrã de pedido de orçamento
**Estado:** Por fazer
**Depende de:** Secção 1 (para guardar o pedido)
**Objetivo:** O botão "Pedir orçamento semelhante" no Detalhe do Trabalho
(`src/screens/WorkDetailScreen.tsx`) ainda não faz nada. Construir o
formulário/fluxo de pedido de orçamento.

### Secção 8 — Fluxo de agendamento de checkup
**Estado:** Por fazer
**Depende de:** Secção 1, Secção 6
**Objetivo:** O botão "Agendar agora" no cartão de "Ação pendente" do
Perfil (`src/screens/ProfileScreen.tsx`) ainda não faz nada. Decidir e
construir: calendário dentro da app, ou só confirmação simples que avisa
a equipa?

### Secção 9 — Conteúdo estático: AI Business & Marble Ads
**Estado:** Por fazer
**Depende de:** nada
**Objetivo:** As secções "AI Business" (consultoria de IA) e "Marble Ads"
(Google/Meta Ads) na Home ainda só têm o cartão — precisam de uma página
própria quando clicadas (provavelmente informativa + formulário de
contacto, sem muita lógica de dados).

### Secção 10 — Distribuição: Xtreme Polishing Systems & Inozetek
**Estado:** Por fazer
**Depende de:** nada
**Objetivo:** O cartão "Xtreme Polishing Systems" na Home precisa de
ligar a algo real (link externo? página própria?). Preparar o mesmo
tratamento para a Inozetek quando a parceria for oficial (ver SPEC.md).

### Secção 11 — Preparação para lançamento nas lojas
**Estado:** Por fazer
**Depende de:** praticamente todas as outras, incluindo a Secção 3
(RGPD) e o projeto Firebase de produção da Secção 1
**Objetivo:** Conta de developer Apple (99$/ano) e Google Play (25$
único), ícones/splash finais em todos os tamanhos, screenshots para as
lojas, ligar a app ao Firebase de **produção**, texto da ficha da loja.

---

## Notas para quem pega numa secção

- Todos os ecrãs seguem o mesmo sistema de cores/tipografia em
  `src/theme/theme.ts` — usa sempre esses tokens, não cores à mão.
- O projeto vive fora do OneDrive de propósito (ver aviso em
  `DEVELOPMENT.md`) — nunca movas a pasta de volta para lá.
- Faz commit no fim da tua secção, com mensagem clara do que ficou feito.
