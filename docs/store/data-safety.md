# Google Play — "Data safety" (rascunho, Secção 11 parte 1)

Respostas para o formulário **Play Console → App content → Data safety**,
derivadas da Política de Privacidade (`src/legal/texts.ts`, versão
2026-09-04). No Play, "recolhido" quer dizer transmitido do telemóvel para
fora, e usar um fornecedor que trabalha por nossa conta (Firebase, Expo,
Cloudinary) **não** conta como "partilhar" — partilhar é ceder a terceiros
para fins deles, o que não fazemos.

Antes de submeter (parte 2), rever as linhas **[Secção 7/8]**: dependem do
que o pedido de orçamento e o agendamento de checkup acabarem por enviar.

## Perguntas gerais

| Pergunta | Resposta |
|---|---|
| A app recolhe ou partilha algum dos tipos de dados exigidos? | **Sim** |
| Todos os dados do utilizador são encriptados em trânsito? | **Sim** (HTTPS em tudo: Firebase, Expo, Cloudinary) |
| A app permite pedir a eliminação dos dados? | **Sim** — na app (Perfil → Apagar conta) e em https://marble-studios-app.web.app/legal/apagar-conta.html |
| Revisão de segurança independente (MASA)? | Não |
| A app cumpre a política de Families? | Não aplicável (público 18+) |

## Tipos de dados

Para cada tipo: recolhido? partilhado? processado de forma efémera?
obrigatório ou opcional? finalidades.

### Informações pessoais

| Tipo | Recolhido | Partilhado | Efémero | Obrigatório | Finalidades |
|---|---|---|---|---|---|
| Nome | Sim | Não | Não | Obrigatório para criar conta (a app funciona sem conta) | Funcionalidade da app; gestão de conta |
| Endereço de email | Sim | Não | Não | Obrigatório para criar conta | Funcionalidade da app; gestão de conta (login, recuperar password) |
| IDs de utilizador | Sim (uid do Firebase) | Não | Não | Obrigatório com conta | Funcionalidade da app; gestão de conta |
| Número de telefone | Sim | Não | Não | Obrigatório para criar conta | Funcionalidade da app (a equipa liga para confirmar checkups) |
| Morada | **Não** | — | — | — | — |
| Outras informações | Sim — endereço IP e agente do utilizador, registados pelo Firebase Authentication por segurança; **[Secção 7/8]** modelo do carro/chão e texto livre que o cliente escreva num pedido de orçamento ou de checkup | Não | Não | Opcional | Funcionalidade da app; segurança e prevenção de fraude |

### Informações financeiras

Nenhuma (sem pagamentos na app).

### Saúde e fitness

Nenhuma.

### Mensagens

| Tipo | Recolhido | Notas |
|---|---|---|
| Outras mensagens na app | **[Secção 7/8]** Sim, se o pedido de orçamento tiver texto livre | Funcionalidade da app; não partilhado; opcional |

### Fotos e vídeos

| Tipo | Recolhido | Partilhado | Efémero | Obrigatório | Finalidades |
|---|---|---|---|---|---|
| Fotos | Sim — só a foto de perfil, se o cliente a escolher | Não (o Cloudinary aloja-a por nossa conta) | Não | Opcional | Funcionalidade da app (mostrar a foto na conta) |
| Vídeos | Não | — | — | — | — |

### Ficheiros de áudio

Nenhum (o plugin do seletor de imagens tem o microfone desligado).

### Ficheiros e documentos

Nenhum.

### Calendário / Contactos

Nenhum.

### Atividade na app

| Tipo | Recolhido | Notas |
|---|---|---|
| Interações na app, histórico de pesquisa, outras apps instaladas, conteúdo gerado | **Não** | Não há analytics (Firebase Analytics desligado), nem SDKs de publicidade |
| Outras ações | Sim — a app grava, no máximo uma vez por dia, a data da última utilização (`lastActiveAt`), para a regra de apagar contas inativas há 3 anos | Funcionalidade da app; não partilhado; obrigatório com conta |

### Navegação na web

Nenhuma.

### Informações e desempenho da app

| Tipo | Recolhido | Notas |
|---|---|---|
| Registos de falhas | **Não** | Não há Crashlytics/Sentry. Se um dia entrar, atualizar aqui e na política |
| Diagnóstico | Não | |

### Dispositivo ou outros IDs

| Tipo | Recolhido | Partilhado | Efémero | Obrigatório | Finalidades |
|---|---|---|---|---|---|
| Dispositivo ou outros IDs | Sim — o token de notificações push (Expo/FCM), só se o cliente ativar as notificações | Não (a Expo entrega por nossa conta) | Não | Opcional | Funcionalidade da app (entregar lembretes de checkup e, com consentimento, novidades) |

## Notas para preencher sem enganos

- **Localização:** nada. A app não pede permissão de localização.
- **Permissões declaradas** (o Play cruza com o formulário): câmara e
  fotografias (foto de perfil, opcional, pedidas só ao tocar no avatar);
  notificações (pedidas só ao tocar em "Ativar notificações" nos Alertas).
  Nenhuma delas é pedida no arranque.
- **Fotos dos trabalhos** (portfólio) são carregadas pela equipa no
  backoffice, não pela app do cliente — não entram aqui.
- **Dados de veículos** (modelo, matrícula) são registados pela equipa no
  backoffice; a app só os mostra. Só passam a "recolhidos" se um formulário
  da app os enviar **[Secção 7/8]**.
- Quando a política de privacidade for revista (parte 2), acrescentar aos
  "dados técnicos mínimos" o endereço IP e o agente do utilizador que o
  Firebase Authentication guarda — hoje a política só fala no identificador
  do dispositivo para push e em registos de erros.
