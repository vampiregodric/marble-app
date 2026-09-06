# Apple — "App Privacy" (rascunho, Secção 11 parte 1)

Respostas para **App Store Connect → App → App Privacy** ("privacy
nutrition labels"), derivadas da Política de Privacidade
(`src/legal/texts.ts`, versão 2026-09-04). Para a Apple, "recolher" é
transmitir para fora do dispositivo, mesmo que seja só para os nossos
próprios servidores ou para fornecedores que trabalham por nossa conta.
"Tracking" é cruzar dados com terceiros para publicidade ou medição — não
fazemos nenhum.

Rever as linhas **[Secção 7/8]** antes de submeter (parte 2).

## Perguntas iniciais

| Pergunta | Resposta |
|---|---|
| Do you or your third-party partners collect data from this app? | **Yes** |
| Privacy Policy URL | https://app.marble.pt/legal/politica-de-privacidade.html |
| User Privacy Choices URL (opcional) | https://app.marble.pt/legal/apagar-conta.html |
| Data used to track you | **No** — em nenhum tipo de dado |

## Tipos de dados a declarar

Para cada tipo: usos (purposes), ligado à identidade (linked to the user)
e tracking.

### Contact Info

| Tipo | Recolhido | Usos | Ligado ao utilizador | Tracking |
|---|---|---|---|---|
| Name | Sim | App Functionality | Sim | Não |
| Email Address | Sim | App Functionality | Sim | Não |
| Phone Number | Sim | App Functionality (a equipa liga para confirmar checkups) | Sim | Não |
| Physical Address | Não | — | — | — |
| Other User Contact Info | Não | — | — | — |

### Health & Fitness / Financial Info / Location / Sensitive Info

Nenhum. (Sem localização: a app não pede a permissão.)

### Contacts

Não.

### User Content

| Tipo | Recolhido | Usos | Ligado ao utilizador | Tracking |
|---|---|---|---|---|
| Photos or Videos | Sim — só a foto de perfil, opcional | App Functionality | Sim | Não |
| Emails or Text Messages | Não | — | — | — |
| Audio Data | Não | — | — | — |
| Customer Support | Não (o suporte é por email, fora da app) | — | — | — |
| Other User Content | **[Secção 7/8]** Sim, se o pedido de orçamento/checkup levar texto livre ou dados do carro | App Functionality | Sim | Não |

### Browsing History / Search History

Não.

### Identifiers

| Tipo | Recolhido | Usos | Ligado ao utilizador | Tracking |
|---|---|---|---|---|
| User ID | Sim (uid do Firebase) | App Functionality | Sim | Não |
| Device ID | Sim — o token de notificações push (Expo/APNs), só se o cliente ativar as notificações | App Functionality | Sim | Não |

### Purchases

Não (sem compras).

### Usage Data

| Tipo | Recolhido | Notas |
|---|---|---|
| Product Interaction | Não | Não há analytics. A única coisa gravada é a data da última utilização, uma vez por dia, para a regra de contas inativas — declarada abaixo em "Other Data Types" |
| Advertising Data | Não | |
| Other Usage Data | Não | |

### Diagnostics

| Tipo | Recolhido | Notas |
|---|---|---|
| Crash Data | Não | Não há Crashlytics/Sentry |
| Performance Data | Não | |
| Other Diagnostic Data | Não | |

### Surroundings / Body / Environment Scanning

Não.

### Other Data Types

| Tipo | Recolhido | Usos | Ligado ao utilizador | Tracking |
|---|---|---|---|---|
| Other Data Types | Sim — (1) data da última utilização (`lastActiveAt`, uma vez por dia) para apagar contas inativas há 3 anos; (2) endereço IP e agente do utilizador registados pelo Firebase Authentication por segurança | App Functionality | Sim | Não |

## Notas

- **Sign in with Apple não é exigido**: a app só tem email/password, sem
  logins de terceiros (Google/Facebook). Se um dia entrar o Google Sign-In,
  a Apple obriga a oferecer também o Sign in with Apple.
- **Apagar conta dentro da app** (regra 5.1.1(v) da Apple): já existe
  (Perfil → Apagar conta) e é referida na página de suporte.
- **Encriptação / export compliance:** `ios.config.usesNonExemptEncryption`
  está a `false` no `app.json` (só HTTPS), por isso a pergunta não aparece
  em cada build.
- **Privacy manifest** (`PrivacyInfo.xcprivacy`): os módulos do Expo e do
  React Native trazem o seu; a app não usa APIs de "required reason" fora
  disso. Se a build for rejeitada por `NSPrivacyAccessedAPITypes`, declara
  as razões em `ios.privacyManifests` no `app.json`.
- **Fotos dos trabalhos** são carregadas pela equipa no backoffice, não pela
  app — não entram aqui.
