# Vertente: dependências

Objetivo: saber que dependências têm vulnerabilidades conhecidas e se
essas vulnerabilidades são alcançáveis neste projeto, o que está
desalinhado com o Expo SDK, e o que está tão atrasado que vai custar a
atualizar. Só leitura: `npm audit` sem `fix`, nunca `npm install`,
`npm update` nem alterações a `package.json`/lock.

Âmbito: `package.json` + `package-lock.json` da app (raiz), de `functions/`
e de `../marble-backoffice/`.

## Método

No Bash, com `export PATH="/c/Program Files/nodejs:$PATH"`. Em cada uma
das três pastas (raiz, `functions`, `../marble-backoffice`):

1. `npm audit --json` e `npm audit --omit=dev --json`. Guarda a
   contagem por severidade das duas (a diferença é o que só existe em
   devDependencies). Se `npm audit` falhar por falta de rede ou de
   `node_modules`, regista em "Não verificado" com o erro.
2. `npm outdated --json` — informativo: major versions atrasadas.
3. `npm ls --depth=0` — dependências em falta ou inválidas (`UNMET`,
   `invalid`).
4. Só na raiz: `npx expo install --check` — versões que não batem com o
   SDK 57 (o comando com `--check` não altera nada; se pedir para corrigir,
   responde não / deixa expirar; se abrir prompt interativo, ignora e
   regista).
5. Lê os três `package.json`: `engines`, versões fixas vs `^`/`~`,
   pacotes que já não são usados no código (`grep -rn "from '<pacote>"`
   em `src`/`functions/src`), lockfiles presentes e no git.
6. `functions/package.json` diz Node 22 (`engines`) e `firebase.json` diz
   `nodejs22`; o Node local é outro — regista o efeito (o que compila e
   corre localmente pode diferir do runtime) e se `DEVELOPMENT.md` avisa.

### Alcance de cada advisory (o que distingue este relatório de um `npm audit`)

Para cada vulnerabilidade da lista, responde:

- **Onde corre o pacote:** no bundle da app (telemóvel/web), no Node das
  Functions (servidor), nos scripts locais do Fábio, ou só em build/dev.
- **A função vulnerável é chamada?** Segue a cadeia `npm audit` →
  `paths`; se o pacote é transitivo de uma ferramenta de build
  (Metro, Vite, `expo` CLI) e a falha é de servidor (ReDoS num parser de
  pedidos HTTP, por exemplo), o alcance real é "só dev" — di-lo.
- **Ação:** atualizar (para que versão, e se cabe no SDK 57 — a versão
  que o `expo install --check` aceita), esperar pelo upstream, ou aceitar
  com motivo.

Tabela final: pacote | versão | severidade npm | onde corre | alcançável
(sim/não/provável) | ação | esforço.

## Lista de verificação

1. Quantas vulnerabilidades por severidade em cada projeto, com e sem
   devDependencies?
2. Quais são alcançáveis em produção (app instalada, Functions, hosting)?
3. O que está desalinhado com o Expo SDK 57?
4. Que dependências estão declaradas e não usadas (ou usadas e não
   declaradas)?
5. Os lockfiles estão no git e batem com o `package.json`?
6. Há pacotes com `postinstall` ou origem invulgar (fora do registo npm,
   `git+`, `file:`)?

## Rubrica desta vertente

- **Crítico:** vulnerabilidade com exploit conhecido, alcançável em
  produção (Functions ou app), sem mitigação.
- **Alto:** vulnerabilidade alta alcançável em produção; dependência
  desalinhada com o SDK que quebra builds nativas.
- **Médio:** vulnerabilidade alcançável só em dev/scripts; major
  atrasada com breaking changes acumulados (ex.: `firebase`, `react-native`
  quando sair o SDK seguinte).
- **Baixo:** avisos, `npm outdated` sem risco.
- **Sugestão:** rotina (Dependabot/Renovate no GitHub, `npm audit` no CI).

## Não é achado

- Advisories em pacotes que só existem em `devDependencies` e cuja falha
  exige tráfego hostil a um servidor de dev local — regista como Baixo
  agrupado, não um por um.
- Versões `~` fixadas pelo Expo (`expo install` gere-as).

## Entrega

Relatório no formato de `esquema.md`, com a tabela de alcance e os
comandos corridos (e a sua saída resumida) em "Âmbito". Cada advisory
alcançável em produção é um achado próprio; as restantes agrupam-se por
projeto.
