# Marble Studios — App Spec (em progresso)

Notas: documento vivo, vai sendo atualizado à medida que o cliente (dono da Marble Studios) for descrevendo requisitos. Nada aqui está fechado/decidido em termos técnicos ainda — é apenas captura de requisitos.

## Empresa

**Marble Studios** — identidade visual preto e dourado, luxo/premium. Portfolio de serviços (ver imagem do cardex enviada).

Departamentos / áreas de negócio — **ordem final confirmada** das secções no ecrã inicial:
1. **Automotive Aesthetics** — detailing, PPF, vinil, etc.
2. **Epoxy Floors** — metallic epoxy, flake systems, solid colours, comercial/industrial (antes "Epoxy Installation")
3. **Graphic Solutions** — trabalhos gráficos
4. **AI Business** — consultoria e ferramentas de IA para otimizar outras empresas (antes "AI Optimization")
5. **Marble Ads** — gestão de publicidade paga (Google Ads, Meta Ads) para empresas clientes (antes "Paid Advertising")
6. **Xtreme Polishing Systems** — cartão próprio de distribuição, tagline "Buy your epoxy here", selo "Oficial" (antes "Epoxy Distribution"). **Página (Secção 10, 2026-09-04):** categorias de produto com texto (resinas, pigmentos metálicos, flakes e quartzo, acabamentos e selantes, ferramentas e kits), "Como comprar" em 4 passos, trabalhos recentes em epóxi, ligação a Epoxy Floors ("preferes que sejamos nós a instalar?") e botão "Pedir cotação". **Decisão do Fábio:** o site da Marble vem primeiro e a página da app passa depois a espelhá-lo; não há loja online ainda, por isso não há link de compra (quando houver, o botão passa a "Comprar na loja" com o URL real da loja da Marble).
7. *(Futuro)* Distribuidores oficiais da **Inozetek** (PPF e vinil para carros) — provavelmente a seguir ao cartão da Xtreme Polishing Systems. **Clarificação (2026-09-04, Fábio):** hoje a Inozetek é só uma das marcas de PPF/vinil que a Marble aplica (há outras); a distribuição em Portugal está em cima da mesa mas não é oficial. Por isso não há cartão nem "distribuidores oficiais" na app — a página Automotive diz "películas de marcas de referência, como a Inozetek" — e o conteúdo da futura página fica preparado no código (ROADMAP, Secção 10, 3 passos para ligar).

## Plataformas
- Android + iOS (App Store)

## Logótipo
- Ficheiro atual em uso: `marble-studios-logo.png` (guardado na pasta do projeto) — versão mais nítida, sem artefactos do WhatsApp, fundo preto puro (0,0,0), 1013x591px.
- Substituiu a primeira versão recebida (`marble-studios-logo.jpeg`, via WhatsApp, com compressão) que ficou obsoleta.
- Integrado no cabeçalho da app com `mix-blend-mode: screen` — como o fundo é preto absoluto e o ecrã da app também é preto puro, o retângulo do logo desaparece por completo.
- **Ainda não tem transparência real (canal alfa)** — funciona perfeitamente em fundos pretos (que é o caso em toda a app), mas para usos futuros em fundos claros/coloridos (ex: material impresso, parceiros) o ideal continua a ser um PNG transparente ou SVG, se existir.

## Estrutura do ecrã inicial (cliente)
- Slideshow/carrossel no topo
- Por baixo, secções para cada departamento/área de negócio (acima)
- **Fotos dos cartões de departamento (decidido 2026-09-04):** cada um dos seis cartões mostra como fundo uma foto **escolhida pela equipa no backoffice** (Destaques > Fotos dos serviços: carregar uma foto ou usar a capa de um trabalho publicado), não a do trabalho mais recente nem um ícone. Sem foto, o cartão fica num gradiente dourado só com o nome e a tagline.
- **Tocar num cartão abre a página de serviços do departamento (decidido 2026-09-04, Secção 9)** — não o Portfólio. Todos os departamentos, incluindo Automotive, Epoxy e Graphic, têm uma página com a mesma estrutura: foto (a do cartão), nome, tagline e headline, intro, "O que fazemos" (3–5 blocos), "Como funciona" (passos numerados), "Investimento" (por agora "sob consulta" em todos) e um botão final "Pedir orçamento"/"Pedir proposta" que abre o pedido de orçamento já com o departamento. Os três com portfólio mostram ainda os trabalhos recentes da categoria (fotos reais) e um "Ver portfólio" que abre o Portfólio filtrado. O conteúdo é estático, no código (`src/data/departmentContent.ts`), só em português por agora, com a estrutura pronta para inglês. A Xtreme Polishing Systems ganhou a sua página na Secção 10 (2026-09-04) com o mesmo ecrã, com rótulos "O que vendemos" / "Como comprar" e uma secção "Ver também" que liga a Xtreme e a Epoxy Floors nos dois sentidos; a Inozetek fica preparada no código, sem cartão, até a parceria ser oficial.

## Funcionalidades — Base de dados de clientes e produtos
- Cada cliente é adicionado à base de dados
- Cada carro / chão (piso epóxi) / produto é associado ao cliente respetivo
- Ligação cliente ↔ carro ↔ trabalho realizado

## Fluxo automático de acompanhamento pós-serviço (exemplo: PPF num carro)
1. Trabalho é registado no sistema (ex: aplicação de PPF colorido)
2. **+1 semana** → notificação ao cliente para agendar um checkup
3. Se o cliente **não confirmar/agendar** o checkup na app → alerta interno para a equipa ligar ao cliente
4. **+1 mês** → oferta automática de lavagem grátis ao cliente, para o trazer de volta ao espaço

**Decidido (2026-09-04, Secção 6):**
- **O acompanhamento é definido trabalho a trabalho, pela equipa, ao registar o trabalho concluído no backoffice** — não há cadência geral. Um PPF completo tem checkup a 1 semana e lavagem a 1 mês; só retrovisores não tem; um detail não tem; um teto estrelado tem. O formulário do trabalho traz o plano padrão (checkup 7 dias, alerta à equipa 3 dias depois do lembrete, lavagem 30 dias) e cada passo liga-se/desliga-se e ajusta-se em dias.
- **Chãos (epóxi) não têm oferta** — a lavagem grátis é só para carros. O checkup e o alerta interno aplicam-se aos dois.
- Os prazos contam a partir da data de conclusão do trabalho; os envios saem às 10:00 (hora de Lisboa).
- O lembrete de checkup é operacional (vai sempre); a oferta é marketing (só com "Ofertas e novidades" ligado — sem isso, a equipa vê no backoffice que não foi enviada e pode falar por telefone).
- Cliente sem conta na app: em vez do lembrete, a equipa recebe logo um alerta interno para lhe ligar.
- "Confirmar o checkup" na app é a Secção 8; até lá, "confirmado" = a equipa marcou o carro/chão em dia no backoffice.

**Decidido (2026-09-04, Secção 8 — agendar o checkup na app):**
- Ao tocar em "Agendar agora" o cliente escolhe um **dia e um período (manhã/tarde)** entre os que a equipa abriu no backoffice — horário semanal (seg–dom × manhã/tarde), dias fechados, quantas semanas à frente, antecedência mínima — e deixa uma nota opcional. Sem calendário completo: "nós no backoffice escolhemos quando dá, porque há de ser sempre fácil e não atrapalha nada".
- O pedido fica **a aguardar aprovação**. A equipa **aprova** (com hora concreta, se quiser) **ou propõe outro dia**; o cliente recebe um alerta com push e, no caso da proposta, confirma na app ou escolhe outro dia. Só depois é que está agendado.
- O cliente pode **alterar e cancelar**. Cancelar = "considera que não quis fazer": o carro/chão sai dos checkups pendentes e a equipa não insiste; pode voltar a pedir na app quando quiser.
- O lado da equipa vive no **backoffice** (página "Checkups" — Secção 7b, depois de a Secção 7 entrar); até existir, o script `npm run checkup:admin` faz o mesmo. O pedido vive no próprio carro/chão (`vehicles/{id}.checkupRequest`), não na coleção `requests` da Secção 7.

## Carrossel do ecrã inicial
- Curadoria **manual** pela equipa (confirmado) — não é automático por "mais recentes". Implica um ecrã de gestão no backoffice para escolher/ordenar destaques.

## Portfólio de trabalhos
- Cada trabalho concluído (carro, chão epóxi, ou trabalho gráfico) entra no portfólio dentro da app
- **Galeria por trabalho (pedido 2026-09-03, construída 2026-09-04 — Secção 5b):** um trabalho pode ter várias fotos e vídeo (ex: 4 fotos + 1 vídeo), não só uma imagem. A foto de capa continua a ser a que aparece nos cartões do Portfólio e do carrossel; no Detalhe a foto do topo é uma galeria deslizável (`works.media[]`, contador "3 / 7", pontos) e tocar em qualquer item abre-o em ecrã inteiro, deslizável, onde o vídeo reproduz com controlos nativos (decisão do Fábio: ecrã inteiro para tudo, não vídeo inline). O upload múltiplo e o alojamento (Cloudinary) são do backoffice (Secção 5).
- **Quem carrega fotos: só a equipa, no backoffice (confirmado 2026-09-03).** O cliente nunca faz upload de fotos de trabalhos na app — a app só mostra. As regras do Firestore refletem isso (`works` sem escrita pelo cliente).
- **Tags nos trabalhos (pedido 2026-09-04; feito na Secção 13, 2026-09-05):** cada trabalho leva o **sistema** (chãos: Metallic Epoxy, Solid Colour Epoxy, Quartz Epoxy, Flake Epoxy) ou o **serviço** (carros: PPF, PPF colorido, Vinil, Detailing, Proteção cerâmica, Teto estrelado; gráfico: Identidade visual, Decoração de viaturas, Montras e sinalética, Impressão, Redes sociais) — lista fixa por categoria, escolha múltipla; publicar sem nenhum só avisa a equipa — e as **marcas** usadas (texto livre com sugestões: Xtreme Polishing Systems, Inozetek…). A app mostra-as no Detalhe como chips pela ordem serviço → marcas e usa o serviço como filtro dentro da categoria no Portfólio. Guardado em `works.services` (ids, traduzidos pela app) + `works.brands`; o antigo `products[]` (texto livre) ficou como legado e foi migrado (ROADMAP, Secção 13 — Tags nos trabalhos: marca e sistema/serviço).
- Cliente tem preferências (checkboxes) para escolher que categorias de trabalho quer ser notificado: carros / chãos / gráfico
- Quando um novo trabalho é adicionado numa categoria, os clientes com opt-in nessa categoria recebem notificação push ("Novo trabalho feito pela Marble Studios")

## Implicações técnicas identificadas (a validar)
- Vai ser necessário um **backoffice/painel de administração** para a equipa gerir: clientes, carros/produtos, trabalhos/portfólio, notificações, lembretes automáticos. **Confirmado (2026-09-03): é uma aplicação separada** da app do cliente, não faz parte deste projeto React Native — ver ROADMAP.md, Secção 5.
- Sistema de notificações push com regras/gatilhos temporais (agendamento automático de lembretes) — **feito (Secção 6, 2026-09-04):** Cloud Functions + Expo Push Service; a permissão de notificações só é pedida ao tocar em "Ativar notificações" — no passo "Recebe os alertas no telemóvel" logo a seguir ao registo (Secção 15, 2026-09-07) ou no cartão do ecrã Alertas — nunca no arranque; tocar no push abre o trabalho/evento/perfil certo.
- Preferências de notificação por categoria, por cliente

## Decisões de arquitetura (confirmadas)
- **Tecnologia:** Cross-platform (React Native ou Flutter) — um código para Android + iOS
- **Login/conta de cliente:** Sim, com conta — necessário para associar carros/chãos, preferências de notificação e fluxo de checkups a cada cliente
  - **Decidido (2026-09-03):** email/password com recuperação por email; Google/Apple sign-in só depois de existir conta de developer. Início, Portfólio e Eventos são visíveis sem conta (montra pública); Perfil e Alertas pedem login. O registo pede nome, email, password e telemóvel (obrigatório — a equipa liga ao cliente no fluxo de checkup).
- **RGPD (decidido 2026-09-03):** registo exige aceitar termos + política
  numa checkbox não pré-marcada; consentimento de marketing ("Ofertas e
  novidades") é separado, desligado por defeito e liga-se só por um gesto
  do cliente — no passo "Recebe os alertas no telemóvel" que aparece uma
  vez logo a seguir ao registo (Secção 15, 2026-09-07) ou no Perfil —
  as preferências por categoria ficam por baixo dele, porque "novo trabalho
  publicado" é marketing. Lembretes de checkup são operacionais e vão
  sempre. Apagar conta anonimiza o registo (histórico de trabalhos fica
  sem ligação à pessoa); contas inativas há 3 anos são apagadas. Textos em
  `src/legal/texts.ts`. Entidade legal: Cacto Elegante, Lda., NIF
  519355849, Rua Quinta das Rosas 12A, 2840-131 Paio Pires; email de
  privacidade app@marble.pt.
- **Idioma:** Português + Inglês — a app é construída em português; o inglês entrou de uma vez na Secção 12 do ROADMAP (decidido 2026-09-04, feito 2026-09-05). **Decisões da Secção 12 (Fábio):** o idioma é o do telemóvel (português → PT, qualquer outro → EN), sem seletor na app; os alertas manuais da equipa (backoffice) ficam como a equipa os escreve — o backoffice mostra "EN" na ficha do cliente para a equipa saber; **os alertas automáticos das Cloud Functions saem no idioma do telemóvel do cliente desde a Secção 12b** (decidido 2026-09-06: `clients.locale`, ausente = PT; o email de confirmação de pedido em EN não lista as opções escolhidas, que se guardam em PT); os textos legais existem só em português (em inglês a app avisa "This document is available in Portuguese only"); os formulários de orçamento mostram as opções no idioma do cliente mas guardam sempre o texto em português, para a equipa ler sempre a mesma coisa.
- **Pagamentos:** Não incluídos na fase inicial — marcações/pedidos ficam registados na app, pagamento tratado à parte. Pode ser adicionado numa fase 2.

## Ecrã de Portfólio (protótipo desenhado)
- Filtros por categoria: Todos, Automotive, Epoxy Floors, Graphic
- Grelha 2 colunas com trabalhos: imagem, selo de categoria, título, tempo desde conclusão
- Ainda por desenhar: ecrã de detalhe ao abrir um trabalho específico
- Imagens ainda placeholder, a aguardar fotos reais

## Pedido de orçamento (decidido 2026-09-04, construído na Secção 7)
- Entra-se pelo "Pedir orçamento semelhante" do Detalhe, pelas páginas dos departamentos (AI Business, Marble Ads; futuro Xtreme) e por "Pedir orçamento" no Perfil.
- **O pedido cria conta (decisão do Fábio):** quem não tem conta escreve nome, email e telemóvel — os mesmos dados do registo — e a app cria-lhe a conta na hora (fica com sessão; recebe um email para definir a password). Email já com conta → pede só a password. Com sessão, os dados vêm da conta. Logo, todos os pedidos ficam ligados a um cliente.
- **Campos por departamento:** o que pretende (opções, ex: PPF / vinil / detailing; metallic / flake / cor sólida), o carro (marca, modelo, ano) ou o espaço (tipo + m²) ou a empresa (nome, site), mensagem livre, fotos opcionais (até 5) e como prefere ser contactado (chamada / WhatsApp / email).
- **A equipa recebe:** alerta interno no Painel do backoffice, email para **quotes@marble.pt** (remetente app@marble.pt, via Resend — a ligar pelo Fábio) e o pedido na página **Pedidos** do backoffice, com estados recebido → em contacto → fechado e notas internas. O cliente recebe "Recebemos o teu pedido" nos Alertas (com push), email de confirmação, e vê o estado em "Os teus pedidos" no Perfil.
- **Prazo prometido ao cliente:** resposta no prazo de **1 dia útil**.
- **RGPD:** base legal = diligências pré-contratuais; os dados pessoais do pedido são apagados **12 meses** depois de fechado (e ao apagar a conta). Um cliente com mais de 3 pedidos em 24 h fica marcado como possível spam.

## Ecrã de Eventos (protótipo desenhado)
- Nova tab na barra inferior (5 tabs agora): Início, Portfólio, **Eventos**, Alertas, Perfil
- Lista de eventos onde a Marble Studios vai estar (feiras, car meets, open days), com foto, data, local
- Filtro Próximos / Passados
- **Por confirmar:** quem pode adicionar eventos — assumido que é só a equipa via backoffice

## Ecrã de Perfil (protótipo desenhado)
- Cabeçalho: avatar, nome, "cliente desde"
- **Foto de perfil (confirmado 2026-09-03, construída 2026-09-04 — Secção 5b):** o cliente põe a sua própria foto de perfil — é a única foto que o cliente carrega na app (as fotos de trabalhos são só da equipa, via backoffice). Tocar no avatar abre um menu: "Escolher da galeria", "Tirar foto" e, quando há foto, "Remover foto". A foto é recortada em quadrado, reduzida a 1024 px no telemóvel e guardada no Cloudinary (preset `marble-avatars`); `clients/{uid}.avatarUrl` fica com o URL de entrega. Aparece no Perfil, no botão de Perfil do Início e na ficha do cliente no backoffice. A política de privacidade declara-a (opcional, base legal = consentimento) e promete apagar o ficheiro do alojamento em 30 dias depois de removida ou de a conta ser apagada — a app só limpa o campo; a Secção 6 automatiza a eliminação no Cloudinary.
- Cartão "Ação pendente": mostra o passo atual do fluxo de acompanhamento (ex: checkup a confirmar), com CTA para agendar
- "Os teus carros & chãos": lista de veículos/pisos associados ao cliente, cada um com estado ("Checkup pendente" / "Em dia")
- "Preferências de notificação": toggle por categoria (Automotive Aesthetics, Epoxy Floors, Graphic Solutions)
- "Conta": dados pessoais, terminar sessão

## Ecrã de Alertas (protótipo desenhado)
- Lista de alertas: lembretes de checkup, novos trabalhos publicados, ofertas (lavagem grátis), lembretes de eventos
- Ponto dourado marca não lido; entrega depende das preferências definidas no Perfil
- Todos os 5 ecrãs principais estão desenhados: Início, Portfólio, Eventos, Alertas, Perfil

## Ecrã de Detalhe do Trabalho (protótipo desenhado)
- Aberto ao clicar num item do Portfólio ou de um Alerta
- Foto grande no topo (real: Jaguar F-Type roxo do Fábio, `work-jaguar-purple.jpg`), badge de categoria, título
- Data, modelo/produto, descrição completa
- Chips de produtos usados (ex: Inozetek, Xtreme Polishing Systems) — liga a distribuição ao portfólio
- CTA fixo em baixo: "Pedir orçamento semelhante" — **feito (Secção 7, 2026-09-04):** abre o formulário de pedido de orçamento com o trabalho como contexto (foto de capa + título) e o departamento pela categoria
- Sem barra de navegação (ecrã empilhado, não é uma tab) — seta de voltar + partilhar no topo

## Por confirmar / em aberto
- Fotos do espaço (ainda não enviadas)
- Logótipo final (ficheiro isolado, ainda não enviado)
- Informação de contacto/negócio (morada, horário, telefone, redes sociais) para secção "sobre"/rodapé
- Conteúdo/navegação secundária: precisa de bottom nav bar? Que secções (Início, Portfólio, Perfil/Conta, Alertas)?

## Ideias para depois do lançamento

- **Simulador "como ficaria" (pedido do Fábio, 2026-09-07):** o cliente
  fotografa o seu chão (sala, garagem, loja) ou o seu carro e vê, na app,
  como ficaria com um sistema/cor de epóxi ou com uma cor/acabamento de
  vinil/PPF da Marble — escolhendo a partir de um trabalho do portfólio ou
  de **amostras** que a equipa carrega no backoffice (texturas de metallic,
  flake, cores sólidas; cores de vinil). Serve para vender: o cliente
  experimenta em casa e pede orçamento com a simulação anexada. Detalhes
  técnicos e decisões em aberto no ROADMAP, Secção 16.
