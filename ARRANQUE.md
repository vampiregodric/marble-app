# Começar aqui (PC novo ou primeira conversa do dia)

Escrito a 2026-09-22, quando o escritório passou a ser o PC principal. As
conversas e a memória do Claude **não viajam** entre PCs — este ficheiro, o
`ROADMAP.md` e o `DEVELOPMENT.md` são o que substitui isso. Se estás a ler
isto numa máquina onde nunca trabalhaste, começa pelo passo 1.

## Onde está tudo

| O quê | Onde |
|---|---|
| App (código) | <https://github.com/vampiregodric/marble-app> |
| Backoffice (código) | <https://github.com/vampiregodric/marble.backoffice> |
| **App a correr** (dados do dev) | <https://marble-studios-dev.web.app> |
| **Backoffice a correr** (dev) | <https://marble-studios-backoffice-dev.web.app> |

Os dois URLs abrem em qualquer browser, telemóvel incluído, sem nada ligado
em casa. A app é uma fotografia do código: para a atualizar, `npm run
web:deploy` (ver `DEVELOPMENT.md`, "A app na web (dev)").

## 1. Pôr o PC a postos

```bash
git clone https://github.com/vampiregodric/marble-app.git
cd marble-app
npm run check:setup
```

O `check:setup` diz, linha a linha, o que falta e o comando de cada caso
(Node, `npm ci`, `.env`, chaves, logins da Firebase CLI e do EAS, backoffice
ao lado, Python/uv). Repete-o até estar tudo OK; a última linha dá o endereço
`exp://<IP>:8081` para o telemóvel. Falta o Node ou o Git? `DEVELOPMENT.md`,
"Segundo PC (escritório)", tem os instaladores e a ordem certa.

## 2. O que o git não traz (tens de levar contigo)

Não estão no GitHub de propósito — são segredos ou coisas da máquina:

- `.env` (app) e `.env` + `.env.production` (backoffice)
- `serviceAccountKey.dev.json` e `serviceAccountKey.prod.json`
- `docs/store/acesso-revisao.local.md` (password da conta de revisão das lojas)
- Sessões da Firebase CLI e do EAS (`login` em cada PC), SDK/AVD do Android

Viajam por pen ou gestor de passwords — nunca por chat, nunca por git.

## 3. Primeira conversa do Claude nesse PC

Cola isto:

> Estou no projeto Marble Studios, na pasta `marble-app` deste PC. Lê o
> `ARRANQUE.md`, o `CLAUDE.md`, o `ROADMAP.md` e o `DEVELOPMENT.md` antes de
> mexeres em código. Corre `git fetch` e diz-me o que está a meio e o que
> recomendas atacar a seguir, em escolha múltipla.

## 4. O que está a meio (2026-09-22)

Trabalho commitado e enviado tal como estava no disco de casa — as mensagens
começam por `Em curso (snapshot para o PC do escritório, 2026-09-22)` e dizem
os ficheiros tocados. `git switch <ramo>` para pegar num:

| Ramo | Assunto |
|---|---|
| `claude/upbeat-solomon-30a96c` | Secção 16 — simulador (ecrã, Functions, regras, i18n) |
| `claude/nervous-lamarr-a104e4` | Simulações, vertex, AuthContext, textos legais, Perfil |
| `claude/modest-cohen-538c30` | Consentimento, jobs (events/followUps/retention), `reads.ts` |
| `claude/silly-liskov-6b20e4` | Ecrãs e desempenho (Photo, WorkGallery, `concurrency.ts`) |
| `claude/sharp-zhukovsky-e70834` | Auditoria 2026-09-12, checklist de contas, demo-account |
| `claude/keen-bassi-f617ad` | Textos das Functions |
| `claude/quirky-hypatia-021bd4` | `.env.production` com o preset do simulador |
| backoffice `claude/wip-escritorio-2026-09-22` | Modelos, ficha do cliente, Simulações |

Nenhum destes está fundido no `master` — decide caso a caso se continuas,
fundes ou deitas fora.

## 5. Pendentes que dependem do Fábio

- **Repositório `marble-app` está PÚBLICO no GitHub.** Fecha-o em
  <https://github.com/vampiregodric/marble-app/settings> → Danger Zone →
  *Change repository visibility* → Private. É o último achado por resolver da
  auditoria de 2026-09-12.
- Levar as chaves e os `.env` do ponto 2 para o PC do escritório.
- Decidir se a app de **produção** alguma vez fica num URL público (hoje só o
  dev está publicado, e é o suficiente para ver a app de qualquer lado).
