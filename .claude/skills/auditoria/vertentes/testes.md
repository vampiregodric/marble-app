# Vertente: testes e cobertura

Objetivo: o projeto não tem um único teste automatizado em nenhum dos
três projetos. Esta vertente não escreve testes: diz que testes provariam
mais com menos, por que ordem, com que ferramentas, e o que é preciso
instalar em cada PC. Só leitura.

Âmbito: `firestore.rules`, `functions/src/`, `src/` (utilitários, dados,
i18n, validação), `../marble-backoffice/src/{utils,data}`, `scripts/`.

## Método

### 1. Inventário do que é testável hoje, sem refatorar

Lê e classifica:

- **Regras Firestore:** cada ramo `allow` e cada função (`validNewRequest`,
  `ownerCheckupWrite`, …) é um caso de teste com
  `@firebase/rules-unit-testing` contra o emulador. Lista os casos que
  provam a matriz de acesso (anónimo / dono / outro cliente / equipa ×
  get / list / create / update / delete) e os casos de ataque (campos da
  equipa em `update`, `publicId` alheio, `clientId` de outro, `createdAt`
  diferente de `request.time`, listas acima do limite).
- **Functions:** `handlers.ts`, `requests.ts`, `simulations.ts`, `push.ts`,
  `notify.ts`, `consent.ts`, `texts.ts`, `time.ts`, `jobs/*.ts` recebem `db`
  e `log` por parâmetro — quais correm com um Firestore falso simples e
  quais precisam do emulador (queries, transações, `FieldValue`). Para os
  externos (`expo.ts`, `email.ts`, `cloudinary.ts`, `vertex.ts`): o
  `fetch` é injetável ou global?
- **App:** funções puras em `src/utils/`, `src/data/requestForms.ts`,
  `src/auth/validation.ts`, `src/auth/errors.ts`, `src/i18n/` (paridade de
  chaves pt/en, placeholders), `src/data/checkups.ts` (dias disponíveis),
  `src/media/images.ts`. Componentes: não propor testes de UI agora (sem
  valor face ao custo neste projeto), exceto se um componente tiver
  lógica que dava para extrair.
- **Backoffice:** `utils/{checkups,dates,followUp,format,departments}.ts`,
  `data/duplicates.ts`.
- **Scripts:** o que é perigoso e não tem guarda (prod) — teste ou
  verificação manual?

### 2. Infraestrutura mínima

Proposta concreta, uma por projeto, com os comandos de instalação (para o
Fábio correr — não os corras tu): runner (`vitest` serve os três, sem
Babel/Metro para a app se se testar só `.ts` puro — confirma que os
ficheiros propostos não importam `react-native`), emulador do Firestore
(`firebase-tools emulators:exec`, precisa de Java — verifica se `java
-version` existe neste PC e regista para o `DEVELOPMENT.md`, "Segundo
PC"), `@firebase/rules-unit-testing`, scripts `npm test` propostos, e o
que muda em `.gitignore`. Diz o custo em tempo e o que dá em troca.

### 3. Backlog priorizado

Tabela: prioridade | projeto | ficheiro de teste proposto | nome do teste
(em português, frase que descreve o comportamento: "recusa criar pedido
com clientId de outro") | o que prova | infra necessária | esforço.

Ordem de prioridade (justifica desvios):

1. Regras Firestore — é o único guarda de dados; cada ramo sem teste é
   um risco silencioso a cada deploy.
2. Functions com dinheiro ou dados: tectos diários, retenção/anonimização,
   simulações (estados), emails (escape), push (tokens).
3. i18n e validação na app (baratos, apanham regressões frequentes).
4. Utilitários do backoffice.

### 4. Ondas e integração contínua

Três ondas com o que cada uma prova quando termina. Propõe um workflow
mínimo do GitHub Actions (typecheck dos três projetos + `vitest` +
emulador para as regras) como Sugestão — repositórios privados têm minutos
grátis; diz quantos gasta por push. Propõe também `npm run typecheck`
antes do commit como passo do `CLAUDE.md`, se ainda não está.

## Lista de verificação

1. Que ramos das regras não têm forma de ser verificados hoje sem
   deploy? (Todos — mas lista-os.)
2. Que funções das Functions correm sem emulador?
3. Que regressões já aconteceram (procura no `git log --grep` por
   "corrig", "fix", "regress", "voltou") e que teste as teria apanhado?
4. O que é preciso instalar num PC novo para correr os testes?
5. Quanto custa a primeira onda (horas) e o que prova?

## Rubrica desta vertente

Os achados aqui são "ausência de prova" — não infles. Regra:

- **Alto:** regra ou Function com efeito em dados/dinheiro sem qualquer
  teste (agrupa por ficheiro: um achado por ficheiro, não por função).
- **Médio:** lógica pura sem testes; sem `typecheck` no fluxo de commit.
- **Sugestão:** CI, cobertura, testes de componentes.

## Não é achado

- Não haver testes de UI/E2E — fora do âmbito por decisão desta skill.
- Componentes React sem testes.

## Entrega

Relatório no formato de `esquema.md`, com o backlog e a proposta de
infraestrutura em secções próprias antes de "O que está bem". O
orquestrador cruza o backlog com os achados de segurança para que cada
pacote de correção leve o teste que o prova.
