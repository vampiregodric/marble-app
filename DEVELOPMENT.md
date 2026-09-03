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

1. **Firebase real** — feito (2026-09-03): `marble-studios-dev` e
   `marble-studios-prod` existem, com Firestore (`eur3`, production mode) e
   Auth (email/password) ativos; config nos `.env` / `.env.production`.
   Ver "Firebase: os dois projetos" abaixo para o que falta (regras + seed).
2. **Ligar os ecrãs ao Firestore** — substituir os arrays de exemplo por
   queries reais (Secção 4 do `ROADMAP.md`).
3. **Painel da equipa (backoffice)** — ainda não desenhado nem construído.
4. **Notificações push** — Firebase Cloud Messaging + lógica dos lembretes
   automáticos (checkup 1 semana depois, etc.) ainda por implementar.
5. **Fotos reais** — só o Jaguar (`assets/work-jaguar-purple.jpg`) e o
   logótipo são reais; o resto são placeholders com gradiente dourado
   (`src/components/PlaceholderThumb.tsx`).

## Firebase: os dois projetos

| | dev | prod |
|---|---|---|
| Project ID | `marble-studios-dev` | `marble-studios-prod` |
| Firestore | `(default)`, `eur3`, production mode | idem |
| Auth | Email/Password | Email/Password |
| App web | "Marble Studios App" | "Marble Studios App" |
| Config | `.env` | `.env.production` |
| Analytics / Gemini / Dev Program | desligados | desligados |

Conta Google dona dos dois: `v.godric@gmail.com`. Se um dia a Marble
Studios tiver conta Google própria, adiciona-a como Owner em
**Definições do projeto > Users and permissions** nos dois projetos.

Ambos foram criados em **production mode** (tudo negado por defeito) — não
há janela de 30 dias de base de dados aberta. As regras reais estão em
`firestore.rules` e fazem-se deploy assim:

```bash
npx firebase-tools login
```

```bash
npx firebase-tools deploy --only firestore:rules --project dev
```

(troca `dev` por `prod` para o outro projeto; os aliases estão em
`.firebaserc`).

### Popular com dados de exemplo

Para o critério de conclusão da Secção 1 ("pelo menos um documento de
exemplo em cada coleção"), usa o script de seed — precisa de uma chave de
service account porque as regras negam escritas de cliente:

```bash
# 1. Descarrega uma chave de service account:
#    Definições do projeto > Contas de serviço > Gerar nova chave privada
#    (guarda como serviceAccountKey.dev.json na raiz do projeto — já está
#    no .gitignore, nunca vai para o git)
# 2. Corre:
npm run seed -- ./serviceAccountKey.dev.json
```

Não faças seed do `prod` — o roadmap diz para o deixar vazio até ao
lançamento (Secção 11).

### Trocar entre dev e prod

Nunca à mão. `npx expo start` lê sempre `.env` (dev). Só uma build de
produção (`eas build --profile production`) lê `.env.production`. Se
precisares de testar contra prod localmente (raro, e só depois do
lançamento), cria `.env.local` com os valores de prod — está no
`.gitignore` e sobrepõe-se ao `.env`; apaga-o quando acabares.

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
