# Vertente: qualidade

Objetivo: dizer onde o código vai custar caro a mudar ou já esconde
defeitos — nomes, duplicação, tratamento de erros, idiomas de React
Native / TypeScript / Firebase, convenções do projeto — e o que está
bem feito. Só leitura.

Âmbito habitual: `src/`, `App.tsx`, `functions/src/`, `scripts/`,
`../marble-backoffice/src`, `../marble-backoffice/scripts`. Testes e
arquitetura têm vertentes próprias — aqui é ao nível do ficheiro e da
função.

## Método

### 1. Compila tudo (só verificação)

No Bash, com o Node no PATH:

```
npx tsc --noEmit
npx tsc --noEmit -p functions
npx tsc --noEmit -p ../marble-backoffice
```

Cada erro é um achado (Alto se está em código que corre, Médio se só em
scripts). Se algum comando não corre (sem `node_modules`), regista em
"Não verificado" com o comando — não instales nada.

### 2. Convenções do projeto (estão escritas — verifica-as)

1. **Tokens do tema** (`ROADMAP.md`, "Notas para quem pega numa secção"):
   `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src --include=*.tsx --include=*.ts`
   fora de `src/theme/theme.ts`. Cada cor à mão num ecrã é Baixo; um ecrã
   inteiro fora do tema é Médio.
2. **Idiomas** (Secção 12): textos de UI fora de `src/i18n/pt.ts`/`en.ts`.
   Procura literais com acentos ou palavras portuguesas em JSX
   (`grep -rnE ">[^<{]*[çãõáéíóú][^<{]*<" src/screens src/components`) e
   `Alert.alert('...')` com texto fixo. Chaves que existem em `pt.ts` e
   faltam em `en.ts` (ou vice-versa): compara as chaves dos dois objetos.
   O backoffice é só PT por decisão — não é achado.
3. **Offline / `fromCache`** (`DEVELOPMENT.md`, lição de 2026-09-10 —
   "criar se não existe" só com `!metadata.fromCache`): procura padrões
   `exists()` seguidos de `setDoc` sem olhar para `fromCache`.
4. **Queries com o filtro que as regras exigem** (`works` e `samples`
   com `published == true`) — cruza com a vertente segurança, mas aqui
   conta como defeito de código se faltar.

### 3. Revisão sistemática (por ficheiro, mas reporta por causa)

- **SOLID / responsabilidades:** componentes ou funções que fazem
  Firestore + formatação + UI; ficheiros com mais de 400 linhas (lista-os
  com contagem); `AuthContext`/`DataContext` que fazem demasiado.
- **DRY:** os três modelos (`src/firebase/models.ts`,
  `../marble-backoffice/src/firebase/models.ts`, `functions/src/types.ts`)
  — corre `diff` entre os dois `models.ts` e compara os tipos com
  `types.ts`; qualquer divergência num campo que se lê ou escreve é Médio
  ou Alto (diz qual). Listas de departamentos/serviços repetidas
  (`src/data/departments.ts`, `../marble-backoffice/src/utils/departments.ts`,
  enums nas regras, `functions/src/texts.ts`). Textos de alertas em dois
  sítios. Formatação de datas em três.
- **Tratamento de erros:** `onSnapshot` sem `onError`; `catch` vazio ou
  que só faz `console.log`; promessas sem `await` nem `.catch`; `useEffect`
  com subscrição sem cleanup; estados de erro que a UI nunca mostra
  (`ListState.tsx` é usado em todos os ecrãs de lista?).
- **Idiomas de RN/TS:** `any` e `as` que escondem tipos; `useEffect` com
  dependências erradas; `FlatList` com `key` em vez de `keyExtractor`;
  `Date` construídas de strings sem fuso; `Timestamp` tratado como `Date`.
- **Functions:** funções puras com `db` e `log` injetados (bom — regista);
  lógica repetida entre `handlers.ts`, `requests.ts`, `simulations.ts`;
  `texts.ts` com `locale` — caminhos em falta.
- **Scripts:** `scripts/*.mjs` com código copiado entre si (leitura da
  chave, seleção do projeto); argumentos sem validação.
- **Código morto e TODO:** exports nunca importados (procura por nome),
  `TODO|FIXME|HACK|XXX` com contexto; ficheiros que nada importa
  (`src/data/localPhotos.ts` já foi apagado — confirma que não sobrou
  referência).
- **Sinais de "feito por IA" a corrigir:** comentários que repetem o
  código, verificações defensivas de casos impossíveis, nomes genéricos
  (`data`, `item`, `handleThing`), abstrações usadas uma vez, `try/catch`
  a embrulhar tudo.

### 4. Reporta por causa, não por ocorrência

"Cor à mão em 14 sítios" é um achado com a lista, não catorze.

## Lista de verificação

1. Compila? Os três projetos, com que resultado.
2. Onde é que o mesmo conceito vive em mais do que um ficheiro e já
   divergiu?
3. Que erros podem acontecer em produção e a UI não mostra nada?
4. Que ecrãs ou páginas são os mais difíceis de mudar, e porquê (tamanho,
   acoplamento, estado)?
5. O que está bem e deve ser o padrão para o resto (nomeia ficheiros).

## Rubrica desta vertente

- **Alto:** erro de tipos em código que corre; divergência entre modelos
  que muda o comportamento; erro engolido num fluxo com dinheiro ou dados
  (pedido, simulação, apagar conta).
- **Médio:** duplicação já divergente; `onSnapshot` sem `onError` em ecrã
  principal; ficheiro-monstro que toda a gente toca.
- **Baixo:** cores à mão, nomes, comentários, `any` isolados.
- **Sugestão:** padrões a adotar.

## Não é achado

- Backoffice só em português (decisão).
- Ausência de linter/formatter: já está registada — reporta uma vez como
  Sugestão com a configuração mínima proposta (ESLint + `typescript-eslint`
  + `eslint-plugin-react-hooks`), não como dez achados de estilo.
- Comentários longos em português a explicar decisões: é o estilo do
  projeto e ajuda quem pega nele.

## Entrega

Relatório no formato de `esquema.md`. Em "O que está bem", os padrões a
seguir, com ficheiro. Em "Não verificado", o que não compilou ou não leste.
