# Ficha das lojas — Marble Studios (Secção 11)

Texto de 2026-09-04, revisto a 2026-09-06 (parte 2) contra a app atual —
as Secções 7 (orçamentos), 8 (checkups), 10 (Xtreme), 12 (inglês) e 13
(tags nos trabalhos) já estão no master e o texto bate com o que a app faz.
Para copiar para o App Store Connect e o Google Play Console. Os limites de
caracteres estão indicados; os textos já cabem. Nas duas lojas a ficha
entra em **português (Portugal)**, como idioma predefinido, e em **inglês
(Reino Unido)**, cada um com os textos da sua língua abaixo.

## Identidade

| Campo | Valor |
|---|---|
| Nome da app (30) | **Marble Studios** — plano B se estiver ocupado na App Store: **Marble Studios App** |
| Subtítulo Apple (30) | PT: `Detailing, PPF e pisos epóxi` · EN: `Detailing, PPF & epoxy floors` |
| Vendedor / programador | Apple mostra sempre o nome legal: **Cacto Elegante, Lda.** · Play: nome de programador **Marble Studios Portugal** ("Marble Studios" já estava registado por outra conta; decidido 2026-09-06) |
| Pacote / bundle | `pt.marble.app` (Android e iOS) |
| Versão inicial | 1.0.0 (`version` no app.json; `versionCode`/`buildNumber` geridos pelo EAS) |
| Preço | Grátis, sem compras integradas, sem anúncios |
| Idiomas | Português (Portugal) e inglês (Secção 12): a app segue o idioma do telemóvel, sem seletor próprio. Ficha em PT-PT (predefinido) + EN-GB |
| Categoria Apple | Primária **Lifestyle**, secundária **Business** (a Apple não tem categoria automóvel) |
| Categoria Play | **Auto & Vehicles** (Automóveis e veículos) |
| Email de suporte (público) | app@marble.pt (a caixa existe e é lida — confirmado 2026-09-05) |
| URL de suporte | https://app.marble.pt/ |
| URL de marketing (opcional) | igual ao de suporte, ou o site da Marble se existir |
| Política de privacidade | https://app.marble.pt/legal/politica-de-privacidade.html |
| Termos | https://app.marble.pt/legal/termos-de-utilizacao.html |
| Apagar conta (exigido pelo Play) | https://app.marble.pt/legal/apagar-conta.html |
| Copyright (Apple) | `2026 Cacto Elegante, Lda.` |

`app.marble.pt` é o domínio próprio ligado (2026-09-06) ao site de Hosting
`marble-studios-app` do projeto Firebase de produção (ver DEVELOPMENT.md);
`https://marble-studios-app.web.app/` continua a servir as mesmas páginas
como reserva.

## Descrição curta (Play, 80 caracteres)

- PT: `A app da Marble Studios: portfólio, eventos, checkups e orçamentos.`
- EN: `The Marble Studios app: portfolio, events, checkups and quotes.`

## Texto promocional (Apple, 170 caracteres)

- PT: `Portfólio, eventos e lembretes de checkup para os clientes da Marble Studios — automotive aesthetics, pisos epóxi e soluções gráficas.`
- EN: `Portfolio, events and checkup reminders for Marble Studios customers — automotive aesthetics, epoxy floors and graphic solutions.`

## Descrição longa — PT (4000 caracteres; ~1500 usados)

```
A Marble Studios é um estúdio em Paio Pires (Seixal) dedicado a automotive aesthetics — detailing, PPF e vinil —, a pisos em epóxi e a soluções gráficas, e ainda a serviços digitais para empresas: AI Business e Marble Ads. A app é a forma mais simples de acompanhar o que fazemos e o que fizemos por ti.

SEM CONTA
• Portfólio — os trabalhos concluídos, com fotografias e vídeo, por categoria (Automotive, Epoxy Floors e Graphic) e por serviço ou sistema: PPF, vinil, detailing, metallic epoxy, flake… com as marcas aplicadas em cada um.
• Serviços — o que cada departamento faz, como funciona, e um pedido de orçamento a um toque.
• Eventos — feiras, car meets e open days onde vamos estar.
• Xtreme Polishing Systems — a nossa distribuição oficial de epóxi.

COM CONTA (GRÁTIS)
• Os teus carros e chãos — o histórico dos trabalhos feitos, os produtos aplicados e o estado de cada checkup.
• Checkups — depois de um PPF ou de um piso novo, a app lembra-te de marcar a revisão; escolhes o dia e a equipa confirma contigo.
• Alertas — novidades do portfólio, eventos e ofertas, só se quiseres: as notificações de marketing estão desligadas por defeito e ligam-se no Perfil.
• Pedidos de orçamento — a partir de qualquer trabalho ou departamento, com fotos se quiseres; resposta em 1 dia útil.

A app está em português e em inglês, conforme o idioma do telemóvel. É gratuita, sem compras nem publicidade. Os serviços são combinados, faturados e pagos diretamente com a equipa. Os teus dados ficam na União Europeia e podes apagar a conta a qualquer momento, dentro da app.

Marble Studios é uma marca da Cacto Elegante, Lda.
```

## Descrição longa — EN (4000 caracteres)

```
Marble Studios is a studio in Paio Pires (Seixal, Portugal) specialising in automotive aesthetics — detailing, PPF and vinyl wraps —, epoxy floors and graphic solutions, plus digital services for businesses: AI Business and Marble Ads. The app is the simplest way to follow what we do and what we have done for you.

WITHOUT AN ACCOUNT
• Portfolio — completed work, with photos and video, by category (Automotive, Epoxy Floors and Graphic) and by service or system: PPF, vinyl, detailing, metallic epoxy, flake… with the brands applied on each one.
• Services — what each department does, how it works, and a quote request one tap away.
• Events — fairs, car meets and open days where you will find us.
• Xtreme Polishing Systems — our official epoxy distribution.

WITH A FREE ACCOUNT
• Your cars and floors — the history of work done, the products applied and the status of each checkup.
• Checkups — after a PPF or a new floor, the app reminds you to book the checkup; you pick the day and the team confirms it with you.
• Alerts — portfolio news, events and offers, only if you want them: marketing notifications are off by default and are switched on in your Profile.
• Quote requests — from any work or department, with photos if you like; we reply within 1 business day.

The app is in English and Portuguese, following your phone's language. It is free, with no purchases and no ads. Services are agreed, invoiced and paid directly with the team. Your data stays in the European Union and you can delete your account at any time, inside the app.

Marble Studios is a brand of Cacto Elegante, Lda.
```

## Palavras-chave (Apple, 100 caracteres, separadas por vírgula)

- PT: `detailing,ppf,vinil,epóxi,pavimentos,carro,checkup,seixal,marble,estúdio,portfólio`
- EN: `detailing,ppf,wrap,epoxy,floors,car,checkup,portugal,marble,studio`

## Novidades da versão 1.0.0

- PT: `Primeira versão: portfólio, serviços, eventos, carros e chãos, agendamento de checkups e pedidos de orçamento. Em português e inglês.`
- EN: `First release: portfolio, services, events, cars and floors, checkup booking and quote requests. In English and Portuguese.`

## Classificação etária e público

- **Apple (questionário):** tudo "None" → **4+**. Não há conteúdo gerado por
  utilizadores visível a outros (a foto de perfil só a própria pessoa e a
  equipa veem), não há apostas, contactos entre utilizadores, nem compras.
- **Play (IARC):** tipo "Utility, Productivity, Communication or Other";
  todas as respostas "No" → PEGI 3 / Everyone.
- **Público-alvo (Play, "Target audience and content"):** só **18+**. A app
  não é dirigida a crianças (os termos exigem 18 anos); não marcar nenhuma
  faixa infantil, senão entram as regras de "Families".
- **Anúncios:** não. **Compras integradas:** não. **Acesso a conteúdo
  restrito:** Perfil e Alertas exigem conta → ver "Acesso à app" abaixo.

## Acesso à app (Play "App access") e notas para a revisão (Apple)

As duas lojas precisam de uma conta de demonstração no **prod** para ver o
Perfil e os Alertas (parte 2: criar `revisao@marble.pt` ou semelhante no
Firebase Auth do prod e associar-lhe um carro com checkup pendente e um
alerta, para os revisores verem os ecrãs cheios). Texto:

```
Início, Portfólio, Serviços e Eventos não pedem conta. Perfil e Alertas pedem
login (email/password). Conta de teste: <email> / <password>. A conta tem um
carro com checkup pendente e alertas de exemplo. Não há compras nem conteúdo
gerado por outros utilizadores.
```

Em inglês, para as notas de revisão da Apple (os revisores leem inglês):

```
Home, Portfolio, Services and Events do not require an account. Profile and
Alerts require login (email/password). Test account: <email> / <password>.
The account has a car with a pending checkup and sample alerts. There are no
purchases and no content generated by other users. The app follows the
device language (Portuguese or English).
```

## Declarações "App content" do Play (para marcar)

| Declaração | Resposta |
|---|---|
| Política de privacidade | URL acima |
| Anúncios | Não contém anúncios |
| Acesso à app | Parte restrita → instruções + conta de demonstração |
| Classificação de conteúdo | Questionário IARC (acima) |
| Público-alvo | 18+ |
| App de notícias | Não |
| App de rastreio COVID-19 | Não |
| Data safety | Ver `data-safety.md` |
| Apps governamentais | Não |
| Funcionalidades financeiras | Nenhuma |
| Saúde | Nenhuma |

## Screenshots e gráficos (parte 2)

- Play: 2 a 8 screenshots de telemóvel (mín. 320 px, máx. 3840 px, proporção
  16:9 a 9:16), ícone 512×512 (`docs/store/play-icon-512.png`, já gerado) e
  gráfico de funcionalidade 1024×500
  (`docs/store/feature-graphic-1024x500.png`, já gerado).
- Apple: screenshots de iPhone 6.9" (1320×2868) e 6.5" (1284×2778 ou
  1242×2688); sem iPad porque `supportsTablet` é `false`. O ícone 1024 vai
  dentro da build.
- Ecrãs: Início, Portfólio (com a fila de serviços dentro de uma
  categoria), Detalhe com galeria e tags, Perfil com carros, Alertas,
  página de departamento. **Em PT e em EN** — cada loja aceita screenshots
  por idioma (no web, `?lang=en` no URL; no telemóvel, o idioma do
  sistema). Tirar depois da Secção 14 (Portfólio filtrado por serviço a
  partir dos departamentos), que ainda mexe no Portfólio.
- Dados: o prod está vazio, por isso as capturas fazem-se contra os dados
  de exemplo do dev (`npm run seed`), na dev build "Marble Dev" ou na app
  web com o frame de telemóvel. Para a Apple, redimensionar para as
  dimensões exatas acima; para o Play qualquer 9:16 entre os limites serve.
