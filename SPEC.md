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
6. **Xtreme Polishing Systems** — cartão próprio de distribuição, tagline "Buy your epoxy here", selo "Oficial" (antes "Epoxy Distribution")
7. *(Futuro)* Distribuidores oficiais da **Inozetek** (PPF e vinil para carros) — provavelmente a seguir ao cartão da Xtreme Polishing Systems

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
- **Tocar num cartão abre a página de serviços do departamento (decidido 2026-09-04, Secção 9)** — não o Portfólio. Todos os departamentos, incluindo Automotive, Epoxy e Graphic, têm uma página com a mesma estrutura: foto (a do cartão), nome, tagline e headline, intro, "O que fazemos" (3–5 blocos), "Como funciona" (passos numerados), "Investimento" (por agora "sob consulta" em todos) e um botão final "Pedir orçamento"/"Pedir proposta" que abre o pedido de orçamento já com o departamento. Os três com portfólio mostram ainda os trabalhos recentes da categoria (fotos reais) e um "Ver portfólio" que abre o Portfólio filtrado. O conteúdo é estático, no código (`src/data/departmentContent.ts`), só em português por agora, com a estrutura pronta para inglês. A Xtreme Polishing Systems (e a Inozetek) ganham a sua página na Secção 10 com o mesmo ecrã.

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

## Carrossel do ecrã inicial
- Curadoria **manual** pela equipa (confirmado) — não é automático por "mais recentes". Implica um ecrã de gestão no backoffice para escolher/ordenar destaques.

## Portfólio de trabalhos
- Cada trabalho concluído (carro, chão epóxi, ou trabalho gráfico) entra no portfólio dentro da app
- **Galeria por trabalho (pedido 2026-09-03, construída 2026-09-04 — Secção 5b):** um trabalho pode ter várias fotos e vídeo (ex: 4 fotos + 1 vídeo), não só uma imagem. A foto de capa continua a ser a que aparece nos cartões do Portfólio e do carrossel; no Detalhe a foto do topo é uma galeria deslizável (`works.media[]`, contador "3 / 7", pontos) e tocar em qualquer item abre-o em ecrã inteiro, deslizável, onde o vídeo reproduz com controlos nativos (decisão do Fábio: ecrã inteiro para tudo, não vídeo inline). O upload múltiplo e o alojamento (Cloudinary) são do backoffice (Secção 5).
- **Quem carrega fotos: só a equipa, no backoffice (confirmado 2026-09-03).** O cliente nunca faz upload de fotos de trabalhos na app — a app só mostra. As regras do Firestore refletem isso (`works` sem escrita pelo cliente).
- Cliente tem preferências (checkboxes) para escolher que categorias de trabalho quer ser notificado: carros / chãos / gráfico
- Quando um novo trabalho é adicionado numa categoria, os clientes com opt-in nessa categoria recebem notificação push ("Novo trabalho feito pela Marble Studios")

## Implicações técnicas identificadas (a validar)
- Vai ser necessário um **backoffice/painel de administração** para a equipa gerir: clientes, carros/produtos, trabalhos/portfólio, notificações, lembretes automáticos. **Confirmado (2026-09-03): é uma aplicação separada** da app do cliente, não faz parte deste projeto React Native — ver ROADMAP.md, Secção 5.
- Sistema de notificações push com regras/gatilhos temporais (agendamento automático de lembretes) — **feito (Secção 6, 2026-09-04):** Cloud Functions + Expo Push Service; a permissão de notificações só é pedida no ecrã Alertas, ao tocar em "Ativar notificações", nunca no arranque; tocar no push abre o trabalho/evento/perfil certo.
- Preferências de notificação por categoria, por cliente

## Decisões de arquitetura (confirmadas)
- **Tecnologia:** Cross-platform (React Native ou Flutter) — um código para Android + iOS
- **Login/conta de cliente:** Sim, com conta — necessário para associar carros/chãos, preferências de notificação e fluxo de checkups a cada cliente
  - **Decidido (2026-09-03):** email/password com recuperação por email; Google/Apple sign-in só depois de existir conta de developer. Início, Portfólio e Eventos são visíveis sem conta (montra pública); Perfil e Alertas pedem login. O registo pede nome, email, password e telemóvel (obrigatório — a equipa liga ao cliente no fluxo de checkup).
- **RGPD (decidido 2026-09-03):** registo exige aceitar termos + política
  numa checkbox não pré-marcada; consentimento de marketing ("Ofertas e
  novidades") é separado, desligado por defeito e liga-se só no Perfil —
  as preferências por categoria ficam por baixo dele, porque "novo trabalho
  publicado" é marketing. Lembretes de checkup são operacionais e vão
  sempre. Apagar conta anonimiza o registo (histórico de trabalhos fica
  sem ligação à pessoa); contas inativas há 3 anos são apagadas. Textos em
  `src/legal/texts.ts`. Entidade legal: Cacto Elegante, Lda., NIF
  519355849, Rua Quinta das Rosas 12A, 2840-131 Paio Pires; email de
  privacidade app@marble.pt.
- **Idioma:** Português + Inglês
- **Pagamentos:** Não incluídos na fase inicial — marcações/pedidos ficam registados na app, pagamento tratado à parte. Pode ser adicionado numa fase 2.

## Ecrã de Portfólio (protótipo desenhado)
- Filtros por categoria: Todos, Automotive, Epoxy Floors, Graphic
- Grelha 2 colunas com trabalhos: imagem, selo de categoria, título, tempo desde conclusão
- Ainda por desenhar: ecrã de detalhe ao abrir um trabalho específico
- Imagens ainda placeholder, a aguardar fotos reais

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
- CTA fixo em baixo: "Pedir orçamento semelhante"
- Sem barra de navegação (ecrã empilhado, não é uma tab) — seta de voltar + partilhar no topo

## Por confirmar / em aberto
- Fotos do espaço (ainda não enviadas)
- Logótipo final (ficheiro isolado, ainda não enviado)
- Informação de contacto/negócio (morada, horário, telefone, redes sociais) para secção "sobre"/rodapé
- Conteúdo/navegação secundária: precisa de bottom nav bar? Que secções (Início, Portfólio, Perfil/Conta, Alertas)?
