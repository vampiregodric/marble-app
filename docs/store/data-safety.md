# Google Play — "Data safety" (Secção 11)

Respostas para o formulário **Play Console → App content → Data safety**,
derivadas da Política de Privacidade (`src/legal/texts.ts`, versão
2026-09-05). No Play, "recolhido" quer dizer transmitido do telemóvel para
fora, e usar um fornecedor que trabalha por nossa conta (Firebase, Expo,
Cloudinary, Resend) **não** conta como "partilhar" — partilhar é ceder a
terceiros para fins deles, o que não fazemos.

Revisto a 2026-09-06 (parte 2) com o que os formulários enviam de facto:
**pedido de orçamento** (Secção 7: contactos da conta, canal preferido,
departamento, opções escolhidas, campos do departamento, mensagem livre,
até 5 fotos, plataforma) e **pedido de checkup** (Secção 8: dia, período e
nota opcional, gravados no carro/chão). As Secções 12 (idioma) e 13 (tags
nos trabalhos) não acrescentaram dados pessoais — ver as notas no fim.
Pronto a copiar para o formulário.

## Perguntas gerais

| Pergunta | Resposta |
|---|---|
| A app recolhe ou partilha algum dos tipos de dados exigidos? | **Sim** |
| Todos os dados do utilizador são encriptados em trânsito? | **Sim** (HTTPS em tudo: Firebase, Expo, Cloudinary) |
| A app permite pedir a eliminação dos dados? | **Sim** — na app (Perfil → Apagar conta) e em https://app.marble.pt/legal/apagar-conta.html |
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
| Outras informações | Sim — (1) endereço IP e agente do utilizador, registados pelo Firebase Authentication por segurança; (2) o que o cliente escreve nos campos de um pedido de orçamento: carro (marca, modelo, ano), espaço (tipo, área em m²), empresa (nome, site, orçamento mensal aproximado), projeto ou produto pretendido, e o canal por que prefere ser contactado (chamada, WhatsApp, email); (3) o dia e o período escolhidos num pedido de checkup | Não | Não | Opcional (só quem faz um pedido) | Funcionalidade da app; segurança e prevenção de fraude (só o IP) |

### Informações financeiras

Nenhuma (sem pagamentos na app).

### Saúde e fitness

Nenhuma.

### Mensagens

Nenhuma. A mensagem livre de um pedido de orçamento não é uma mensagem
entre utilizadores (emails, SMS, chat) — é uma resposta aberta num
formulário e declara-se em "Atividade na app → Outro conteúdo gerado pelo
utilizador", abaixo.

### Fotos e vídeos

| Tipo | Recolhido | Partilhado | Efémero | Obrigatório | Finalidades |
|---|---|---|---|---|---|
| Fotos | Sim — (1) a foto de perfil, se o cliente a escolher; (2) até 5 fotos que o cliente junte a um pedido de orçamento (do carro, do espaço, ou referências) | Não (o Cloudinary aloja-as por nossa conta) | Não | Opcional | Funcionalidade da app (mostrar a foto na conta; preparar o orçamento) |
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
| Interações na app, histórico de pesquisa, outras apps instaladas | **Não** | Não há analytics (Firebase Analytics desligado), nem SDKs de publicidade |
| Outro conteúdo gerado pelo utilizador | Sim — a mensagem livre de um pedido de orçamento e a nota opcional de um pedido de checkup | Funcionalidade da app; não partilhado (a equipa lê no backoffice; o Resend envia o pedido por email à equipa por nossa conta); opcional |
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
  fotografias (foto de perfil e fotos de um pedido de orçamento, opcionais,
  pedidas só ao tocar no avatar ou em "Juntar fotos"); notificações
  (pedidas só ao tocar em "Ativar notificações" nos Alertas). Nenhuma delas
  é pedida no arranque.
- **Fotos dos trabalhos** (portfólio) e as **tags** de cada trabalho
  (serviço/sistema e marcas, Secção 13) são escritas pela equipa no
  backoffice, não pela app do cliente — não entram aqui.
- **Dados de veículos** (modelo, matrícula) registados pela equipa no
  backoffice: a app só os mostra. O que o cliente escreve no campo "Carro"
  de um pedido de orçamento já está declarado em "Outras informações".
- **Idioma (Secção 12):** a app lê o idioma do telemóvel para escolher
  PT ou EN e envia-o ao Firebase Auth só para os emails saírem nesse
  idioma; não fica guardado. Quando a Secção 12b entrar, o idioma passa a
  ficar na conta (`clients.locale`, "pt" ou "en") para os alertas
  automáticos saírem na língua do cliente — é uma definição da app, não um
  dos tipos de dados do formulário; nada a acrescentar.
- **`platform`** (android / ios / web) guardado com cada pedido de
  orçamento não é um identificador de dispositivo — não se declara.
- **App Check** (quando entrar, depois das lojas — ver ROADMAP, Secção 11):
  o Play Integrity envia à Google um veredito sobre o dispositivo e a app;
  rever este formulário nessa altura.
- Quando a política de privacidade for revista (advogado), acrescentar aos
  "dados técnicos mínimos" o endereço IP e o agente do utilizador que o
  Firebase Authentication guarda — hoje a política só fala no identificador
  do dispositivo para push e em registos de erros.
