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
**Estado:** Por fazer
**Depende de:** nada — pode começar já
**Objetivo:** Criar o projeto Firebase real (Firestore + Authentication),
preencher `src/firebase/config.ts`, e desenhar a estrutura de coleções:
`clients`, `vehicles` (carro/chão, ligado a um `clientId`), `works`
(trabalhos do portfólio), `events`, `notifications`/`reminders`.
**Critério de conclusão:** app liga-se ao Firebase sem erros; coleções
criadas na consola com pelo menos um documento de exemplo em cada.

### Secção 2 — Autenticação de cliente
**Estado:** Por fazer
**Depende de:** Secção 1
**Objetivo:** Ecrã de login/registo (email/password, e possivelmente
Google/Apple sign-in), ligado ao Firebase Auth. Perfil passa a mostrar
dados do utilizador autenticado em vez do "Fábio Pombinho" fixo.
**Ficheiros:** novo `src/screens/LoginScreen.tsx`, ajustar
`RootNavigator.tsx` para mostrar login antes das tabs quando não há sessão.

### Secção 3 — Ligar os 6 ecrãs a dados reais
**Estado:** Por fazer
**Depende de:** Secção 1 (e idealmente Secção 2)
**Objetivo:** Substituir os arrays de exemplo (`WORKS`, `EVENTS`,
`ALERTS`, `departments`, etc.) por queries Firestore reais, ecrã a ecrã.
Pode ser dividido ainda mais (ex: "Secção 3a — Portfólio real",
"Secção 3b — Perfil real") se uma conversa não chegar para os 6.
**Nota:** este é o maior bloco de trabalho — vale a pena fatiar por ecrã.

### Secção 4 — Painel da equipa (backoffice)
**Estado:** Por fazer
**Depende de:** Secção 1
**Objetivo:** Interface para a equipa da Marble Studios gerir clientes,
carros/chãos, trabalhos (adicionar ao portfólio), eventos, e escolher o
que aparece no carrossel do Início. Provavelmente uma app web separada
(ex: outro projeto React/Next.js a apontar para o mesmo Firebase), não
faz parte da app React Native do cliente.
**Decisão em aberto:** confirmar com o Fábio se deve ser web ou também
mobile.

### Secção 5 — Notificações push automáticas
**Estado:** Por fazer
**Depende de:** Secção 1, Secção 3
**Objetivo:** Firebase Cloud Messaging + Cloud Functions (ou scheduler
equivalente) para o fluxo descrito no SPEC.md: +1 semana após um trabalho
→ lembrete de checkup; sem confirmação → alerta interno à equipa; +1 mês
→ oferta automática (lavagem grátis para carros, inspeção/manutenção
para chãos — **por confirmar com o Fábio**, ver SPEC.md).

### Secção 6 — Ecrã de pedido de orçamento
**Estado:** Por fazer
**Depende de:** Secção 1 (para guardar o pedido)
**Objetivo:** O botão "Pedir orçamento semelhante" no Detalhe do Trabalho
(`src/screens/WorkDetailScreen.tsx`) ainda não faz nada. Construir o
formulário/fluxo de pedido de orçamento.

### Secção 7 — Fluxo de agendamento de checkup
**Estado:** Por fazer
**Depende de:** Secção 1, Secção 5
**Objetivo:** O botão "Agendar agora" no cartão de "Ação pendente" do
Perfil (`src/screens/ProfileScreen.tsx`) ainda não faz nada. Decidir e
construir: calendário dentro da app, ou só confirmação simples que avisa
a equipa?

### Secção 8 — Conteúdo estático: AI Business & Marble Ads
**Estado:** Por fazer
**Depende de:** nada
**Objetivo:** As secções "AI Business" (consultoria de IA) e "Marble Ads"
(Google/Meta Ads) na Home ainda só têm o cartão — precisam de uma página
própria quando clicadas (provavelmente informativa + formulário de
contacto, sem muita lógica de dados).

### Secção 9 — Distribuição: Xtreme Polishing Systems & Inozetek
**Estado:** Por fazer
**Depende de:** nada
**Objetivo:** O cartão "Xtreme Polishing Systems" na Home precisa de
ligar a algo real (link externo? página própria?). Preparar o mesmo
tratamento para a Inozetek quando a parceria for oficial (ver SPEC.md).

### Secção 10 — Preparação para lançamento nas lojas
**Estado:** Por fazer
**Depende de:** praticamente todas as outras
**Objetivo:** Conta de developer Apple (99$/ano) e Google Play (25$
único), ícones/splash finais em todos os tamanhos, screenshots para as
lojas, política de privacidade (obrigatória para apps com contas de
utilizador), texto da ficha da loja.

---

## Notas para quem pega numa secção

- Todos os ecrãs seguem o mesmo sistema de cores/tipografia em
  `src/theme/theme.ts` — usa sempre esses tokens, não cores à mão.
- O projeto vive fora do OneDrive de propósito (ver aviso em
  `DEVELOPMENT.md`) — nunca movas a pasta de volta para lá.
- Faz commit no fim da tua secção, com mensagem clara do que ficou feito.
