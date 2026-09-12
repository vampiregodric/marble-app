---
name: auditoria
description: Auditoria dinâmica da Marble Studios (app Expo, Cloud Functions, regras Firestore, scripts de admin e backoffice ao lado) em sete vertentes — segurança, qualidade, desempenho, dependências, testes, arquitetura e RGPD. Lança agentes em paralelo, consolida num relatório em auditorias/AAAA-MM-DD.md, publica a página privada e propõe as correções como botões. Usa quando o Fábio pedir uma auditoria, uma revisão de segurança ou de qualidade do projeto, "o que está mal no código", ou para reverificar os achados de uma auditoria anterior.
argument-hint: [completo | desde | verificar] [vertentes=seguranca,qualidade,desempenho,dependencias,testes,arquitetura,rgpd] [--sem-backoffice]
---

# Auditoria — workflow dinâmico

Esta skill corre na conversa principal (precisa de `Agent`, `AskUserQuestion`,
`spawn_task` e `Artifact`). Tu és o orquestrador: decides o que corre,
lanças os agentes, verificas e consolidas. Os agentes só leem. Tu também
só lês código — as correções são conversas à parte (Fase 4).

"Dinâmico" quer dizer três coisas: o âmbito adapta-se ao que existe e ao
que mudou desde a última auditoria; o número de agentes adapta-se ao
tamanho de cada vertente; e o resultado gera trabalho (pacotes de correção
com botão) e é reverificado na corrida seguinte.

## Regras invioláveis

1. **Só leitura.** Ninguém (tu ou agentes) altera código, dependências ou
   dados: nada de deploys, `npm install/update`, `npm audit fix`, seeds,
   migrações, `checkup:admin`, `functions:jobs` ou qualquer script que
   escreva no Firebase. Permitido: `npm audit` (sem `fix`), `npm outdated`,
   `npx expo install --check`, `tsc --noEmit`, `git log/diff/blame`, `grep`.
2. **Sem segredos no relatório.** Nunca copies valores de chaves, tokens ou
   `.env` para lado nenhum. Cita ficheiro e linha.
3. **Relatórios em `auditorias/` (raiz).** `docs/` é a pasta pública do
   Firebase Hosting — nunca lá.
4. **Formato único.** Cada achado segue `esquema.md` (nesta pasta). Sem
   isso a consolidação e a reverificação não funcionam.
5. **Português**, direto, sem ícones decorativos. Um achado que contraria
   uma decisão documentada (`SPEC.md`, `ROADMAP.md`, `DEVELOPMENT.md`) diz
   qual é a decisão e porque é que mesmo assim vale a pena olhar.

## Fase 0 — Preparação: decidir o que corre

1. `git fetch` na app e em `../marble-backoffice`. Regista os SHAs curtos de
   HEAD dos dois — vão para o cabeçalho do relatório. Se `master` está
   atrás de `origin/master`, avisa (CLAUDE.md, "Dois PCs") e pergunta em
   escolha múltipla se integra antes de auditar.
2. **Modo** (argumento):
   - sem argumento: `desde` se `auditorias/` já tem relatórios, senão
     `completo`;
   - `completo`: todas as superfícies presentes, todas as vertentes;
   - `desde`: lê `app_commit` e `backoffice_commit` do relatório mais
     recente; `git diff --name-only <sha>..HEAD` nos dois repositórios;
     mapeia os ficheiros alterados para superfícies (tabela abaixo). As
     vertentes ativas são as que cobrem superfícies alteradas, mais
     `dependencias` se algum `package.json`/`package-lock.json` mudou.
     Inclui SEMPRE a reverificação dos achados anteriores ainda abertos
     (Crítico, Alto e Médio). Se nada mudou e nada está aberto, di-lo e
     para;
   - `verificar`: só a reverificação dos achados abertos;
   - `vertentes=a,b,c`: lista explícita, sobrepõe-se ao cálculo;
   - `--sem-backoffice`: exclui a superfície `backoffice`.
3. **Superfícies** — o que existe no disco decide (se uma pasta falta,
   avisa e segue sem ela; o backoffice é a pasta irmã `../marble-backoffice`):

   | Superfície | Caminhos |
   |---|---|
   | regras | `firestore.rules`, `firestore.indexes.json` |
   | functions | `functions/src/**`, `functions/.env*`, `functions/package.json` |
   | app | `src/**`, `App.tsx`, `index.ts`, `app.json`, `app.config.js`, `eas.json`, `.env.production`, `.env.example`, `locales/**`, `google-services.json` |
   | scripts | `scripts/**`, `../marble-backoffice/scripts/**` |
   | hosting | `docs/**`, `firebase.json`, `../marble-backoffice/firebase.json` |
   | backoffice | `../marble-backoffice/src/**`, `../marble-backoffice/vite.config.ts`, `../marble-backoffice/index.html` |
   | dependencias | `package.json` e lock da app, de `functions/` e do backoffice |

   Vertente → superfícies que cobre: **seguranca** todas; **qualidade**
   app, functions, backoffice, scripts; **desempenho** app, functions,
   backoffice, regras (índices); **dependencias** dependencias;
   **testes** regras, functions, app, backoffice; **arquitetura** app,
   functions, backoffice, regras; **rgpd** app, functions, regras,
   backoffice, hosting (textos legais).
4. **Agentes por vertente.** Uma vertente = um agente, exceto:
   - `seguranca` divide-se sempre em duas partes (A: regras + functions +
     scripts; B: app + backoffice + hosting + configuração Firebase) —
     é a vertente que mais pesa e a que menos pode ficar superficial;
   - qualquer outra vertente com mais de 80 ficheiros no âmbito
     divide-se por superfície (um agente por superfície).
5. **Pasta de trabalho:** `<scratchpad>/auditoria/` (a pasta scratchpad
   desta sessão está no prompt do sistema; cria a subpasta). Cada agente
   escreve lá `<vertente>[-<parte>].md`. Apaga o que lá estiver de corridas
   anteriores desta sessão antes de lançar.
6. Mostra ao Fábio uma tabela antes de lançar — vertente | superfícies |
   partes | modelo — e lança de seguida. Não perguntes se pode correr: ao
   invocar a skill já decidiu.

## Fase 1 — Lançamento em paralelo

- **Uma única mensagem** com todas as chamadas `Agent`,
  `subagent_type: "general-purpose"`, `run_in_background: true`.
- **Modelo:** `fable` para `seguranca` (A e B); `opus` para as restantes.
  Nunca `haiku`.
- Enquanto correm, não adivinhes resultados nem escrevas o relatório.
  Espera pelas notificações. Se um agente falhar ou devolver um relatório
  vazio ou fora do formato, relança-o uma vez com o mesmo prompt; se
  falhar outra vez, a vertente entra em "Não verificado" com o motivo.
- Prompt de cada agente — copia e preenche (`{...}`), não resumas:

```
Auditoria da Marble Studios — vertente {VERTENTE}{, parte {A|B}: {superfícies}}.
Data {AAAA-MM-DD}. Modo {completo|desde|verificar}.

Trabalhas SÓ EM LEITURA: não alteres nenhum ficheiro dos projetos, não corras
deploys, seeds, migrações, `npm install`, `npm update`, `npm audit fix` nem
scripts que escrevam no Firebase. Podes correr: `npm audit --json` (sem fix),
`npm outdated`, `npx expo install --check`, `npx tsc --noEmit`, `git log`,
`git diff`, `git blame`, `grep`. O Node não está no PATH das tuas shells: no
Bash faz primeiro `export PATH="/c/Program Files/nodejs:$PATH"`.

Lê primeiro, por esta ordem, e só depois começa:
1. {SKILL_DIR}/vertentes/{vertente}.md — a metodologia desta vertente.
   Segue todos os passos e responde a todas as perguntas da lista de
   verificação; onde a resposta é "está bem", diz onde confirmaste.
2. {SKILL_DIR}/esquema.md — o formato obrigatório de cada achado e do
   relatório. IDs com o prefixo {PREFIXO} (ex.: {PREFIXO}-01).
3. CLAUDE.md, SPEC.md, ROADMAP.md (só as linhas "Estado" e as decisões
   da secção que tocares) e DEVELOPMENT.md da app — contexto do negócio
   e decisões já tomadas. Um achado que contraria uma decisão documentada
   tem de a citar.

Projeto: app do cliente em React Native / Expo SDK 57 (React 19, RN 0.86,
SDK JS do Firebase 12, TypeScript 6) em `src/`; Cloud Functions v2 (Node 22,
firebase-functions 7) em `functions/src`; regras em `firestore.rules`;
scripts de administração Node em `scripts/`; páginas públicas em `docs/`
(Firebase Hosting); backoffice web da equipa (React 19 + Vite, SDK de
cliente do Firebase, sem servidor próprio) em `../marble-backoffice/src`.
Dois projetos Firebase: marble-studios-dev e marble-studios-prod
(Firestore em eur3). Fotos e vídeos no Cloudinary (presets unsigned).
Emails pelo Resend. Push pelo Expo. Simulador de imagem no Vertex AI.
Dois tipos de utilizador no mesmo Auth: cliente (app) e equipa (custom
claim `admin: true`, backoffice). Sem testes, linter nem CI em nenhum
repositório.

Âmbito desta corrida: {LISTA EXATA DE PASTAS E FICHEIROS}.
{Modo desde: ficheiros alterados desde {sha}: {lista}. Achados anteriores
a reverificar (ID, ficheiro:linha, título) — para cada um diz "ainda
aberto", "corrigido" (com evidência) ou "já não se aplica": {lista}.}

Entrega:
- O relatório completo, no formato de esquema.md, escrito com a ferramenta
  Write em {SCRATCH}/{vertente}[-{parte}].md, em português.
- Como resposta final, SÓ: a tabela de contagem por severidade e uma linha
  por achado Crítico ou Alto (ID — título — ficheiro:linha). Nada mais.
```

  Prefixos: `SEG-A`, `SEG-B`, `QUA`, `DES`, `DEP`, `TES`, `ARQ`, `RGPD`
  (uma vertente dividida por superfície usa `QUA-APP`, `QUA-FN`, etc.).

## Fase 2 — Consolidação (fazes tu, não delegas)

1. Lê todos os ficheiros de `<scratchpad>/auditoria/`.
2. **Duplicados:** o mesmo ficheiro+linha, ou a mesma causa vista por
   vertentes diferentes, vira um achado só, com todas as vertentes
   listadas e a severidade mais alta. Mantém os IDs originais na linha
   "Também:" para se poder voltar ao relatório do agente.
3. **Verificação própria:** para CADA Crítico e Alto abre o ficheiro e
   confirma o cenário de falha. Se não se confirma, baixa a severidade ou
   move para "Descartados" com o motivo. Um achado com confiança
   "provável" não fica Crítico sem confirmação tua.
4. **Ordem:** severidade > superfície (regras, functions, app, backoffice,
   scripts, hosting, dependencias) > esforço (S antes de L).
5. **Pacotes de correção:** agrupa os Crítico e Alto (e os Médio com a
   mesma causa) em pacotes de uma conversa cada (meio dia no máximo),
   independentes entre si sempre que possível. Cada pacote tem objetivo,
   achados incluídos, critério de "feito" (de preferência um teste que
   prove a correção — cruza com a vertente `testes`) e esforço. Nome:
   `Auditoria AAAA-MM-DD — Pacote N — <nome>`.
6. Achados Médio/Baixo/Sugestão que não entram em pacotes ficam listados
   no relatório com estado "aberto" — a corrida `desde` seguinte volta a
   olhar para eles.

## Fase 3 — Relatório

1. Escreve `auditorias/AAAA-MM-DD.md` (se já existir um de hoje,
   `AAAA-MM-DD-2.md`) com o modelo de `esquema.md`. O cabeçalho YAML é
   obrigatório: é dele que o modo `desde` lê os SHAs.
2. Atualiza a tabela de corridas em `auditorias/README.md`.
3. Página privada: `npm run auditoria:pagina` gera
   `scripts/out/auditoria.html` a partir do relatório mais recente (não vai
   para o git). Publica com a ferramenta `Artifact`: se `auditorias/README.md`
   já tem o link, faz `action: "read"` nesse `url` e publica depois com o
   mesmo `url`; se não tem, publica sem `url` (favicon: uma lupa) e escreve
   o link no README. Nunca cries uma página nova quando já existe uma.
4. Mostra na conversa o resumo executivo: tabela severidade × vertente,
   os pacotes, e o que ficou por verificar.

## Fase 4 — Ações

1. **Um `spawn_task` por pacote** de Crítico/Alto. Título:
   `Auditoria AAAA-MM-DD — Pacote N — <nome>`. Prompt autocontido: pasta
   do projeto, ler `auditorias/AAAA-MM-DD.md` (secção do pacote e os
   achados), regras do `CLAUDE.md`, corrigir com testes quando o critério
   de "feito" os pede, atualizar o **Estado** de cada achado no relatório
   (`corrigido (commit)`), commit + push. Se o pacote toca no backoffice,
   diz que o repositório é `../marble-backoffice` e que também leva commit
   + push. Os pacotes só de Médio ficam listados para o Fábio escolher.
2. Diz quais pacotes podem correr em paralelo (não tocam nos mesmos
   ficheiros) e quais não.
3. `AskUserQuestion` com o passo seguinte — recomendado primeiro: abrir o
   pacote 1 agora; abrir vários em paralelo; só guardar por agora.

## Fase 5 — Fecho

1. `ROADMAP.md`: secção `### Auditoria contínua` (cria-a antes de "Notas
   para quem pega numa secção" se não existir) com uma linha
   `**Estado:**` — data, modo, contagens por severidade, pacotes abertos.
   É daí que a página de progresso lê.
2. Commit (relatório, README, ROADMAP) com mensagem clara do que a
   auditoria encontrou em números; `git push`.
3. Página de progresso — passos do `CLAUDE.md`, "Página de progresso".

## Estado dos achados ao longo do tempo

Cada achado tem `Estado: aberto | corrigido (commit) | aceite (motivo,
data) | descartado (motivo)`. As conversas de correção mudam o estado no
próprio relatório. Nas corridas `desde` e `verificar`, o agente da vertente
recebe a lista dos abertos e responde por cada um; tu confirmas os que
passam a "corrigido" olhando para o `git log -S` ou para o código.
"Aceite" é decisão do Fábio (em escolha múltipla) — nunca tua.
