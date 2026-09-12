# Vertente: arquitetura e acoplamento

Objetivo: mapear como a app, as Cloud Functions, as regras e o backoffice
se ligam, quem escreve o quê, onde o mesmo conceito vive em vários sítios,
e propor só o que é proporcional a um projeto de uma pessoa com dois
repositórios. Só leitura.

Âmbito: `src/`, `functions/src/`, `firestore.rules`,
`../marble-backoffice/src`, `scripts/`, `SPEC.md` ("Decisões de
arquitetura"), `DEVELOPMENT.md`.

## Método

### 1. Mapa

Desenha em ASCII (vai para o relatório) os componentes e os fluxos de
dados: app → Firestore (SDK cliente, regras) → triggers → Cloudinary /
Resend / Expo / Vertex; backoffice → Firestore (SDK cliente, `isAdmin`);
scripts → Admin SDK; jobs diários. Marca onde há validação (regras,
Functions, só UI).

### 2. Matriz de propriedade dos campos

Para cada coleção de `COLLECTIONS` (`src/firebase/models.ts`), por campo:
quem escreve (app-cliente / backoffice / Functions / scripts) e quem lê.
Conflitos a assinalar: dois escritores no mesmo campo sem regra que
arbitre; campos que as Functions escrevem e as regras deixam o cliente
alterar (cruza com segurança); campos que existem no tipo e ninguém
escreve (mortos) ou que se escrevem e não existem no tipo.

### 3. Duplicação estrutural

1. Os três modelos: `src/firebase/models.ts`,
   `../marble-backoffice/src/firebase/models.ts`, `functions/src/types.ts`.
   Corre `diff` entre os dois `models.ts` e compara com `types.ts` tipo a
   tipo. Lista as divergências e o efeito de cada uma. O `CLAUDE.md` do
   backoffice pede sincronização à mão — isso está a funcionar?
2. Constantes de domínio repetidas: departamentos, serviços, marcas,
   limites (`REQUEST_LIMITS`, `CHECKUP_LIMITS`, `WORK_TAG_LIMITS`), enums
   nas regras (`department in [...]`, `contactPreference in [...]`),
   versões legais (`LEGAL_VERSION` na app, nos textos publicados, nas
   Functions/consent). Onde é que uma mudança tem de ser feita em N sítios?
3. Textos: `src/i18n/*`, `functions/src/texts.ts`, textos do backoffice
   (`SendAlertModal` modelos), `src/legal/texts.ts` vs `docs/legal/*.html`
   (gerado por `scripts/build-legal-html.mjs` — confirma que está em dia:
   compara datas/versões).
4. Configuração: `.env`, `.env.production`, `functions/.env*`, `app.json`,
   `app.config.js`, `eas.json`, `.firebaserc` — onde o projectId, o cloud
   name, os presets e os URLs se repetem.

### 4. Fronteiras e decisões

- O backoffice escreve com o SDK de cliente (sem servidor): lógica de
  negócio no browser (acompanhamento, alertas, juntar fichas) — o que
  fica sem validação além das regras; o que já está planeado para
  callables (App Check, Secção 11c em `DEVELOPMENT.md`).
- Camadas na app: ecrãs → `src/data/*` (hooks) → `src/firebase/*`. Há
  ecrãs a chamar o Firestore diretamente? Componentes a importar dados?
- Navegação e estado global: `AuthContext`, `navigationRef`, i18n — o que
  depende de quê (ciclos de importação: `npx madge` não está instalado —
  não instales; procura à mão ciclos óbvios entre `src/data`, `src/auth` e
  `src/navigation`).
- Scripts: catorze `.mjs` com leitura de chave e escolha de projeto
  repetidas — há um helper partilhado? Que scripts já não se usam?

### 5. Propostas proporcionais

Só o que uma pessoa mantém: um script de verificação que falha quando os
modelos divergem (`node scripts/check-models.mjs` a correr no
`check:setup` ou no CI) vale mais do que um monorepo. Para cada proposta:
o que resolve, o que custa, quando vale a pena (agora / quando houver X).
Não proponhas reescritas.

## Lista de verificação

1. Que campo pode ser escrito por dois lados sem arbitragem?
2. Em que é que os três modelos já diferem?
3. Que mudança de negócio simples (ex.: novo departamento, novo limite de
   fotos) obriga a tocar em quantos ficheiros e repositórios? Lista-os.
4. Que lógica de negócio corre só no browser da equipa?
5. O que está bem desenhado e deve continuar assim (com ficheiro).

## Rubrica desta vertente

- **Alto:** divergência entre modelos ou constantes que já muda
  comportamento hoje; dois escritores no mesmo campo com perda de dados
  possível.
- **Médio:** duplicação que ainda não divergiu mas não tem guarda;
  fronteira que deixa lógica crítica só na UI.
- **Baixo / Sugestão:** organização, nomes de pastas, helpers para scripts.

## Não é achado

- Ter dois repositórios (app e backoffice) — decisão.
- Backoffice sem servidor — decisão documentada; reporta só as
  consequências não documentadas.
- Modelos duplicados por si: o achado é a divergência ou a falta de guarda.

## Entrega

Relatório no formato de `esquema.md`, com o mapa ASCII e a matriz de
propriedade em secções próprias antes de "O que está bem". Propostas em
"Sugestão" salvo quando há divergência real.
