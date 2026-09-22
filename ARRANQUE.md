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

## 2. O que o git não traz — e não, não precisas de levar nada

Primeiro: **o que é que queres fazer neste PC?**

| Quero… | Preciso de… |
|---|---|
| Ver a app e o backoffice | **Nada.** Os dois URLs acima abrem em qualquer browser |
| Escrever código, commitar, fazer push, `npm run typecheck` | **Nada** além do clone |
| Correr a app (`npm start`, servidor para o telemóvel) | o `.env` |
| Deploys, seeds, `dev-token`, scripts de admin | o `.env` + `serviceAccountKey.dev.json` + login na Firebase CLI |
| Builds da app (EAS) | login no EAS (abre o browser) |

E o que falta **refaz-se no próprio PC**, com o teu login Google — a pen é só
o atalho:

- **`.env` (app):** copia o `.env.example` para `.env`. Os seis valores do
  Firebase tiram-se da consola (Definições do projeto → As tuas apps → SDK
  setup) do projeto `marble-studios-dev`; os do Cloudinary estão no
  `.env.production`, que vai no git (é a mesma conta Cloudinary). Estes
  valores **não são segredos** — o Firebase inclui-os no bundle de qualquer
  app publicada; quem protege os dados são as Firestore Rules.
- **`.env` e `.env.production` (backoffice):** o mesmo, a partir do
  `.env.example` do repositório do backoffice.
- **`serviceAccountKey.dev.json` / `.prod.json`:** consola do Firebase →
  Definições do projeto → Contas de serviço → *Gerar nova chave privada*.
  Gerar uma nova **não invalida a antiga**, por isso o PC de casa continua a
  funcionar. Estes sim são segredos reais: ficam fora do git (já estão no
  `.gitignore`) e nunca se colam num chat.
- **`docs/store/acesso-revisao.local.md`:** é só a password da conta de
  revisão das lojas. Está no teu gestor de passwords; se não estiver, define
  outra com `npm run demo:account` (ver `DEVELOPMENT.md`).
- **Sessões da Firebase CLI e do EAS:** `login` em cada PC, abre o browser.
- **SDK/AVD do Android:** só se quiseres o emulador — passos no
  `DEVELOPMENT.md`, "Segundo PC", 1c.

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
- Repor o `.env` e as chaves no PC do escritório (ponto 2) — só quando
  quiseres correr a app ou fazer deploys; para ver e para escrever código não
  é preciso nada.
- Decidir se a app de **produção** alguma vez fica num URL público (hoje só o
  dev está publicado, e é o suficiente para ver a app de qualquer lado).
