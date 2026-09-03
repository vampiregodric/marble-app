# Marble Studios App — notas de desenvolvimento

## Como correr o projeto

```
npx expo start --web      # preview no browser
npx expo start            # QR code para abrir na app Expo Go (Android/iOS)
```

## Estado atual (fase MVP — UI com dados de exemplo)

Ecrãs construídos e verificados a renderizar corretamente:
- `src/screens/HomeScreen.tsx` — Início
- `src/screens/PortfolioScreen.tsx` — Portfólio
- `src/screens/EventsScreen.tsx` — Eventos
- `src/screens/AlertsScreen.tsx` — Alertas
- `src/screens/ProfileScreen.tsx` — Perfil
- `src/screens/WorkDetailScreen.tsx` — Detalhe de um trabalho

Todos usam dados de exemplo fixos no próprio ficheiro (arrays no topo de cada
screen). Ainda não há ligação real à base de dados.

## Por fazer a seguir

1. **Firebase real** — falta só criar os dois projetos na consola (ver secção
   abaixo, "Firebase: os dois projetos"). O resto (config por variáveis de
   ambiente, modelo de dados, regras, script de seed) já está pronto.
2. **Ligar os ecrãs ao Firestore** — substituir os arrays de exemplo por
   queries reais (Secção 4 do `ROADMAP.md`).
3. **Painel da equipa (backoffice)** — ainda não desenhado nem construído.
4. **Notificações push** — Firebase Cloud Messaging + lógica dos lembretes
   automáticos (checkup 1 semana depois, etc.) ainda por implementar.
5. **Fotos reais** — só o Jaguar (`assets/work-jaguar-purple.jpg`) e o
   logótipo são reais; o resto são placeholders com gradiente dourado
   (`src/components/PlaceholderThumb.tsx`).

## Firebase: os dois projetos

Isto é um passo manual — precisa da tua conta Google, não pode ser feito
por automação. Demora uns 5 minutos por projeto. Repete para os dois:

1. Vai a https://console.firebase.google.com e clica "Add project" /
   "Adicionar projeto".
2. Nome sugerido: `marble-studios-dev` para o primeiro, `marble-studios-prod`
   para o segundo (se o nome já estiver ocupado globalmente, o Firebase
   sugere um ID alternativo — usa esse e atualiza `.firebaserc`).
3. Google Analytics: opcional, podes desativar para simplificar.
4. Depois de criado: **Build > Firestore Database > Create database**.
   - Região recomendada: uma região europeia (ex: `eur3` multi-region ou
     `europe-west1`/`europe-west4`) — os dados são de clientes na UE
     (RGPD, ver Secção 3 do `ROADMAP.md`). Evita `us-central` por defeito.
   - Modo: "Start in test mode" está bem por agora (expira em 30 dias;
     `firestore.rules` já tem as regras reais prontas para deploy quando a
     Secção 2 ligar o login).
5. **Build > Authentication > Get started** e ativa pelo menos o provedor
   "Email/Password" (a Secção 2 trata do ecrã de login).
6. **Definições do projeto (engrenagem) > Geral > As tuas apps > Web (`</>`)**
   — regista uma app web (nome: "Marble Studios App"), copia os 6 valores
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`) para:
   - `.env` se for o projeto **dev**
   - `.env.production` se for o projeto **prod**
7. Atualiza `.firebaserc` com os IDs reais dos projetos se forem diferentes
   de `marble-studios-dev` / `marble-studios-prod`.

Depois de fazeres isto para o projeto **dev**, corre `npx expo start --web`
— a app deve arrancar sem o erro "Config do Firebase em falta".

### Popular com dados de exemplo

Para o critério de conclusão da Secção 1 ("pelo menos um documento de
exemplo em cada coleção"), a forma mais rápida é o script de seed:

```bash
# 1. Descarrega uma chave de service account:
#    Definições do projeto > Contas de serviço > Gerar nova chave privada
#    (guarda como serviceAccountKey.dev.json na raiz do projeto — já está
#    no .gitignore, nunca vai para o git)
# 2. Corre:
npm run seed -- ./serviceAccountKey.dev.json
```

Repete com a chave do projeto `prod` se quiseres confirmar que também
funciona lá (o roadmap diz para o deixar "vazio" até ao lançamento, mas
testar uma vez que liga sem erros é razoável).

## Nota importante: pasta do projeto está dentro do OneDrive

Isto causa um problema real: o Metro (o compilador do Expo) às vezes não
deteta alterações a ficheiros guardados nesta pasta, porque o OneDrive
interfere com a monitorização de ficheiros do Windows. Sintoma: editas um
ficheiro, mas o que aparece no telemóvel/browser continua a versão antiga.

**Solução se isto acontecer:** parar o servidor (Ctrl+C) e voltar a correr
`npx expo start`. Isso força a reler tudo do disco.

**Solução definitiva (recomendada):** mover esta pasta para fora do
OneDrive, por exemplo para `C:\Users\VGodr\Projects\marble-app`. Pastas de
projetos de código não devem viver em pastas sincronizadas na cloud
(OneDrive/Dropbox/Google Drive) — é uma prática standard, não é specific
a este projeto.
